/* eslint-disable no-console */
import 'dotenv/config';
import fs from 'fs/promises';
import { glob } from 'glob';
import { find, isFunction, size, values } from 'lodash';
import path from 'path';
import { Pool } from 'pg';

import { QueryBlueprint } from '../src/common/query-builder/query-blueprint.base';

// --- Configuration ---
const SOURCE_GLOB_PATTERN = 'src/queries/blueprints/*.blueprint.ts';
const OUTPUT_DIR = path.resolve(process.cwd(), 'public/query-configs');

// --- Database Configuration ---
// Make sure you have a .env file with these variables,
// or that they are available in your environment.
const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

/**
 * Syncs a query blueprint to the database for all users.
 * This function performs two actions within a transaction:
 * 1. Upserts the system-default configuration (where userId is NULL).
 * 2. Updates all existing user-specific configurations that share the same key.
 *    WARNING: This will overwrite any user customizations for that view.
 * @param dbPool The database connection pool.
 * @param key The unique key for the configuration.
 * @param value The JSON value of the configuration.
 */
const syncBlueprintToDb = async (dbPool: Pool, key: string, value: object) => {
    const configValueJson = JSON.stringify(value);
    const client = await dbPool.connect();

    console.log(`   📝 Syncing blueprint for key: "${key}"`);

    try {
        await client.query('BEGIN');

        const checkQuery = `
            SELECT "id" FROM "nvn_query_configs" WHERE "key" = $1 AND "userId" IS NULL;
        `;
        const { rows } = await client.query(checkQuery, [key]);

        if (rows.length > 0) {
            const updateSystemQuery = `
                UPDATE "nvn_query_configs"
                SET "value" = $1, "updatedAt" = NOW()
                WHERE "key" = $2 AND "userId" IS NULL;
            `;
            const result = await client.query(updateSystemQuery, [configValueJson, key]);
            console.log(`   ✔️ UPDATE system record successful. Rows affected: ${result.rowCount}`);
        } else {
            // The "id" column is removed from INSERT as the DB now generates it.
            const insertSystemQuery = `
                INSERT INTO "nvn_query_configs" ("key", "value", "userId", "createdAt", "updatedAt")
                VALUES ($1, $2, NULL, NOW(), NOW());
            `;
            const result = await client.query(insertSystemQuery, [key, configValueJson]);
            console.log(`   ✔️ INSERT new system record successful. Rows affected: ${result.rowCount}`);
        }

        const updateUserQuery = `
            UPDATE "nvn_query_configs"
            SET "value" = $1, "updatedAt" = NOW()
            WHERE "key" = $2 AND "userId" IS NOT NULL;
        `;
        const updateResult = await client.query(updateUserQuery, [configValueJson, key]);
        if (updateResult.rowCount > 0) {
            console.log(`   🔄 Synced ${updateResult.rowCount} user-specific record(s) for: ${key}`);
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(`   ❌ Failed to sync database records for: ${key}`, error);
        throw error;
    } finally {
        client.release();
    }
};

const main = async () => {
    console.log('🔵--- Query Blueprint JSON Generator ---🔵');
    console.log(`🔍 Searching for blueprints using pattern: ${SOURCE_GLOB_PATTERN}`);

    const blueprintFiles = await glob(SOURCE_GLOB_PATTERN, { absolute: true });

    if (size(blueprintFiles) === 0) {
        console.warn('⚠️ No blueprint files found. Exiting.');
        return;
    }

    console.log(`✅ Found ${size(blueprintFiles)} blueprint file(s).`);

    try {
        await pool.query('SELECT 1');
        console.log('🐘 Connected to database successfully.');
    } catch (error) {
        console.error('❌ Could not connect to the database. Please check your .env configuration.', error);
        process.exit(1);
    }

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

                // Upsert the configuration into the database
                await syncBlueprintToDb(pool, blueprintInstance.name, blueprintInstance);
            } else {
                console.warn(`   ⚠️ No exported class extending QueryBlueprint found in ${path.basename(filePath)}`);
            }
        } catch (error) {
            console.error(`   ❌ Error processing file ${path.basename(filePath)}:`, error);
        }
    }

    console.log('✨--- Generation Complete ---✨');
};

void (async () => {
    try {
        await main();
    } catch (err) {
        console.error('An unexpected error occurred:', err);
        process.exit(1);
    } finally {
        await pool.end();
        console.log('👋 Database connection closed.');
    }
})();
