/* eslint-disable no-console */
import fs from 'fs/promises';
import { glob } from 'glob';
import { isFunction, find, values, size } from 'lodash';
import path from 'path';

import { QueryBlueprint } from '../src/common/query-builder/query-blueprint.base';

// --- Configuration ---
const SOURCE_GLOB_PATTERN = 'src/queries/blueprints/*.blueprint.ts';
const OUTPUT_DIR = path.resolve(process.cwd(), 'public/query-configs');
// ---

/**
 *
 */
const main = async () => {
    console.log('🔵--- Query Blueprint JSON Generator ---🔵');
    console.log(`🔍 Searching for blueprints using pattern: ${SOURCE_GLOB_PATTERN}`);

    const blueprintFiles = await glob(SOURCE_GLOB_PATTERN, { absolute: true });

    if (size(blueprintFiles) === 0) {
        console.warn('⚠️ No blueprint files found. Exiting.');
        return;
    }

    console.log(`✅ Found ${size(blueprintFiles)} blueprint file(s).`);

    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`🚀 Generating JSON configs in: ${OUTPUT_DIR}`);

    for (const filePath of blueprintFiles) {
        try {
            const module = (await import(filePath)) as Record<string, unknown>;
            const BlueprintClass = find(
                values(module),
                (exported): exported is { new (): QueryBlueprint<any> } =>
                    isFunction(exported) && exported.prototype instanceof QueryBlueprint,
            );

            if (BlueprintClass) {
                const blueprintInstance = new BlueprintClass();
                const configJson = JSON.stringify(blueprintInstance, null, 2);
                const outputFileName = `${blueprintInstance.name}.json`;
                const outputPath = path.join(OUTPUT_DIR, outputFileName);

                await fs.writeFile(outputPath, configJson);
                console.log(`   ✔️ Successfully generated: ${outputFileName}`);
            } else {
                console.warn(`   ⚠️ No exported class extending QueryBlueprint found in ${path.basename(filePath)}`);
            }
        } catch (error) {
            console.error(`   ❌ Error processing file ${path.basename(filePath)}:`, error);
        }
    }

    console.log('✨--- Generation Complete ---✨');
};

main().catch((err) => {
    console.error('An unexpected error occurred:', err);
    process.exit(1);
});
