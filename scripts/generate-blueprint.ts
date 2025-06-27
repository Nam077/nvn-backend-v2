/* eslint-disable no-console */
import ejs from 'ejs';
import fs from 'fs/promises';
import inquirer from 'inquirer';
import { kebabCase, snakeCase, toLower, toUpper, trim, upperCase } from 'lodash';
import path from 'path';

// --- Configuration ---
const TEMPLATE_PATH = path.resolve(process.cwd(), 'scripts/templates/blueprint.ejs');
const OUTPUT_DIR = path.resolve(process.cwd(), 'src/queries/blueprints');

// --- Helper Functions ---
const validateNonEmpty = (input: string) => (trim(input) ? true : 'This field cannot be empty.');
const toPascalCase = (str: string) => upperCase(str.charAt(0)) + str.slice(1);

/**
 * Main generator function.
 */
const main = async () => {
    console.log('🔵--- Blueprint Generator ---🔵');

    // 1. Get user input
    const answers = await inquirer.prompt<{
        modelName: string;
        modulePath: string;
        overwrite?: boolean;
    }>([
        {
            type: 'input',
            name: 'modelName',
            message: 'Enter the Model name (e.g., User, Font, FontCategory):',
            filter: (input) => toPascalCase(trim(input as string)),
            validate: validateNonEmpty,
        },
        {
            type: 'input',
            name: 'modulePath',
            message: 'Enter the module directory name (e.g., users, fonts):',
            filter: (input) => toLower(trim(input as string)),
            validate: validateNonEmpty,
        },
    ]);

    const { modelName, modulePath } = answers;
    const entityFileName = kebabCase(modelName);
    const outputFileName = `${entityFileName}.blueprint.ts`;
    const outputPath = path.join(OUTPUT_DIR, outputFileName);

    // 2. Check if file exists and confirm overwrite
    try {
        await fs.access(outputPath);
        const { overwrite } = await inquirer.prompt<{ overwrite: boolean }>([
            {
                type: 'confirm',
                name: 'overwrite',
                message: `⚠️ The file "${outputFileName}" already exists. Do you want to overwrite it?`,
                default: false,
            },
        ]);
        if (!overwrite) {
            console.log('🚫 Operation cancelled. Exiting.');
            return;
        }
    } catch {
        // File does not exist, which is the normal case.
    }

    // 3. Render the template
    console.log('📝 Rendering template...');
    const templateContent = await fs.readFile(TEMPLATE_PATH, 'utf-8');
    const blueprintName = toUpper(snakeCase(modelName));

    const renderedContent = ejs.render(templateContent, {
        modelName,
        modulePath,
        entityFileName,
        blueprintName,
    });

    // 4. Write the new file
    await fs.writeFile(outputPath, renderedContent);

    console.log(`✨ Successfully generated blueprint: ${outputPath}`);
    console.log('🎉 --- Generation Complete --- 🎉');
};

// --- Run ---
main().catch((err) => {
    console.error('❌ An unexpected error occurred:', err);
    process.exit(1);
});
