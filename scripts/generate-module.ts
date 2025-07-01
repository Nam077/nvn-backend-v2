/* eslint-disable no-console */
import ejs from 'ejs';
import fs from 'fs/promises';
import inquirer from 'inquirer';
import {
    camelCase,
    endsWith,
    filter,
    get,
    includes,
    kebabCase,
    lowerCase,
    upperFirst,
    trim,
    replace,
    split,
} from 'lodash';
import path from 'path';

// --- Helper Functions ---

// Basic pluralization, good enough for many cases.
const pluralize = (str: string) => (endsWith(str, 's') ? str : `${str}s`);
const singularize = (str: string) => (endsWith(str, 's') ? str.slice(0, -1) : str);

// Custom PascalCase to handle various inputs like 'userManagement' -> 'UserManagement'
const toPascalCase = (str: string) => upperFirst(camelCase(str));

interface NameSet {
    moduleName: string; // The original input from the user (e.g., 'product', 'userManagement')
    moduleNameKebabCase: string; // 'product', 'user-management'
    moduleFullPath: string; // Full path including subdirectories (e.g., 'product/demo')

    modelName: string; // 'Product', 'UserManagement' (PascalCase, singular)
    modelNamePlural: string; // 'Products', 'UserManagements' (PascalCase, plural)

    modelNameSingularCamelCase: string; // 'product', 'userManagement'
    modelNameSingularKebabCase: string; // 'product', 'user-management'
    modelNameSingularLowerCase: string; // 'product', 'usermanagement'

    modelNamePluralCamelCase: string; // 'products', 'userManagements'
    modelNamePluralKebabCase: string; // 'products', 'user-managements'

    tableName: string; // 'products', 'user_managements'
}

const createNameSet = (rawName: string): NameSet => {
    const cleanName = trim(rawName);

    // Support nested paths like "product/demo" or "admin/users"
    const pathParts = split(cleanName, '/');
    const actualModuleName = pathParts[pathParts.length - 1]; // Get the last part as module name

    const singularPascal = toPascalCase(singularize(actualModuleName));
    const pluralPascal = pluralize(singularPascal);

    return {
        moduleName: kebabCase(actualModuleName), // Use only the module name for kebab case
        moduleNameKebabCase: kebabCase(actualModuleName),
        moduleFullPath: cleanName, // Store the full path for directory creation

        modelName: singularPascal,
        modelNamePlural: pluralPascal,

        modelNameSingularCamelCase: camelCase(singularPascal),
        modelNameSingularKebabCase: kebabCase(singularPascal),
        modelNameSingularLowerCase: replace(lowerCase(singularPascal), / /g, ''),

        modelNamePluralCamelCase: camelCase(pluralPascal),
        modelNamePluralKebabCase: kebabCase(pluralPascal),

        tableName: replace(pluralize(kebabCase(singularPascal)), /-/g, '_'),
    };
};

// --- Configuration ---
const TEMPLATE_DIR = path.resolve(process.cwd(), 'scripts/templates/module');
const OUTPUT_DIR_BASE = path.resolve(process.cwd(), 'src/modules');

const getTemplateFiles = async () => {
    const allFiles = await fs.readdir(TEMPLATE_DIR, { recursive: true, withFileTypes: true });
    return filter(allFiles, (file) => file.isFile() && endsWith(file.name, '.ejs'));
};

/**
 * Main generator function.
 */
const main = async () => {
    console.log('🔵--- Module Generator ---🔵');

    // Allow providing module name as a command-line argument
    let moduleNameInput = get(process.argv, 2);
    const force = includes(process.argv, '--force');

    if (!moduleNameInput) {
        const answers = await inquirer.prompt<{ moduleNameInput: string }>([
            {
                type: 'input',
                name: 'moduleNameInput',
                message: 'Enter the name of the new module (e.g., product, admin/users, ecommerce/products):',
                validate: (input) => (input ? true : 'Module name cannot be empty.'),
            },
        ]);
        moduleNameInput = get(answers, 'moduleNameInput');
    }

    const names = createNameSet(moduleNameInput);
    const outputDir = path.join(OUTPUT_DIR_BASE, names.moduleFullPath); // Use full path for nested modules

    console.log(`✅ Generating module: ${names.modelName}`);
    console.log(`   📂 Output directory: ${outputDir}`);

    // Check if module already exists
    try {
        await fs.access(outputDir);
        if (!force) {
            const answers = await inquirer.prompt<{ overwrite: boolean }>([
                {
                    type: 'confirm',
                    name: 'overwrite',
                    message: `Module directory "${names.moduleFullPath}" already exists. Overwrite?`,
                    default: false,
                },
            ]);
            if (!get(answers, 'overwrite', false)) {
                console.log('🚫 Operation cancelled.');
                return;
            }
        }
    } catch {
        void 0;
    }

    // Ensure the output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    const templateFiles = await getTemplateFiles();

    for (const templateFile of templateFiles) {
        const templatePath = path.join(templateFile.path, templateFile.name);
        const relativeTemplatePath = path.relative(TEMPLATE_DIR, templatePath);

        const filenameMap = {
            'entities/entity.ejs': `entities/${names.modelNameSingularKebabCase}.entity.ts`,
            'dto/create.dto.ejs': `dto/create-${names.modelNameSingularKebabCase}.dto.ts`,
            'dto/update.dto.ejs': `dto/update-${names.modelNameSingularKebabCase}.dto.ts`,
            'dto/response.dto.ejs': `dto/${names.modelNameSingularKebabCase}.response.dto.ts`,
            'controllers/controller.ejs': `controllers/${names.moduleName}.controller.ts`,
            'services/service.ejs': `services/${names.moduleName}.service.ts`,
            'module.ejs': `${names.moduleName}.module.ts`,
        };

        const targetRelativePath = get(filenameMap, relativeTemplatePath) as string;

        if (!targetRelativePath) {
            console.warn(`   ⚠️ No mapping for template file ${relativeTemplatePath}, skipping.`);
            continue;
        }

        const targetPath = path.join(outputDir, targetRelativePath);

        // Ensure subdirectory exists (e.g., for dtos)
        await fs.mkdir(path.dirname(targetPath), { recursive: true });

        console.log(`   -> Generating ${path.relative(outputDir, targetPath)}`);

        const templateContent = await fs.readFile(templatePath, 'utf-8');
        const renderedContent = ejs.render(templateContent, names);

        await fs.writeFile(targetPath, renderedContent);
    }

    console.log(`✨ Successfully generated module: ${names.modelName}`);
    console.log('🎉 --- Generation Complete --- 🎉');

    // Auto-fix ESLint issues in the generated module
    console.log('🔧 Running ESLint fix on generated module...');
    try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);

        await execAsync(`npx eslint ${outputDir} --fix`);
        console.log('✅ ESLint fix completed successfully.');
    } catch {
        void 0;
    }
};

// --- Run ---
main().catch((err) => {
    console.error('❌ An unexpected error occurred:', err);
    process.exit(1);
});
