/* eslint-disable no-console */
import ejs from 'ejs';
import fs from 'fs/promises';
import { glob } from 'glob';
import inquirer from 'inquirer';
import { filter, last, map, replace, snakeCase, split, toUpper, trim, size } from 'lodash';
import path from 'path';
// --- Configuration ---
const TEMPLATE_PATH = path.resolve(process.cwd(), 'scripts/templates/blueprint.ejs');
const OUTPUT_DIR = path.resolve(process.cwd(), 'src/queries/blueprints');
const ENTITY_GLOB_PATTERN = 'src/modules/**/*.entity.ts';

// --- Helper Functions ---
interface EntityInfo {
    modelName: string;
    modulePath: string;
    entityFileName: string;
    fullPath: string;
}

const findEntities = async (): Promise<EntityInfo[]> => {
    const entityFiles = await glob(ENTITY_GLOB_PATTERN, { absolute: true });

    const entityInfoPromises = map(entityFiles, async (filePath): Promise<EntityInfo | null> => {
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const match = fileContent.match(/export class (\w+)/);

            if (!match || !match[1]) {
                console.warn(`   ⚠️ Could not parse model name from ${path.basename(filePath)}. Skipping.`);
                return null;
            }

            const [, modelName] = match;
            const parts = split(filePath, '/');
            const fileName = last(parts) || '';
            const entityFileName = replace(fileName, '.entity.ts', '');
            const modulePath = parts[parts.length - 3];

            return {
                modelName,
                modulePath,
                entityFileName,
                fullPath: filePath,
            };
        } catch {
            console.warn(`   ⚠️ Could not read or process ${path.basename(filePath)}. Skipping.`);
            return null;
        }
    });

    const results = await Promise.all(entityInfoPromises);
    return filter(results, (result): result is EntityInfo => result !== null);
};

/**
 * Main generator function.
 */
const main = async () => {
    console.log('🔵--- Blueprint Generator ---🔵');
    console.log('🔍 Scanning for entities...');

    const entities = await findEntities();
    if (size(entities) === 0) {
        console.error('❌ No entity files found. Please create an entity first.');
        return;
    }

    console.log(`✅ Found ${size(entities)} entities.`);

    // 1. Get user input
    const { selectedEntityPath } = await inquirer.prompt<{ selectedEntityPath: string }>([
        {
            type: 'list',
            name: 'selectedEntityPath',
            message: 'Select the entity to generate a blueprint for:',
            choices: map(entities, (e) => ({
                name: `${e.modelName} (from modules/${e.modulePath})`,
                value: e.fullPath,
            })),
        },
    ]);

    const selectedEntity = entities.find((e) => e.fullPath === selectedEntityPath);
    if (!selectedEntity) {
        console.error('❌ Invalid selection. Exiting.');
        return;
    }

    const { modelName, modulePath, entityFileName } = selectedEntity;
    const outputFileName = `${entityFileName}.blueprint.ts`;
    const outputPath = path.join(OUTPUT_DIR, outputFileName);

    // 2. Check if file exists and warn if it has content before overwriting
    try {
        const existingContent = await fs.readFile(outputPath, 'utf-8');
        let overwriteMessage = `⚠️ The file "${outputFileName}" already exists. Do you want to overwrite it?`;

        if (trim(existingContent).length > 0) {
            overwriteMessage = `🔥🔥🔥 DANGER: The file "${outputFileName}" is not empty and may contain custom code. Overwriting will delete all changes. Are you absolutely sure?`;
        }

        const { overwrite } = await inquirer.prompt<{ overwrite: boolean }>([
            {
                type: 'confirm',
                name: 'overwrite',
                message: overwriteMessage,
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
