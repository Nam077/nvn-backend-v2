/* eslint-disable no-console */
import 'dotenv/config';
import { Pool } from 'pg';

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
 * Fetches and displays system-level query configurations from the database.
 */
const checkSystemConfigs = async () => {
    console.log('🔵--- Checking System Query Configurations in DB ---🔵');
    const client = await pool.connect();

    try {
        const query = `
            SELECT "id", "key", "userId", "updatedAt"
            FROM "query_configs"
            WHERE "userId" IS NULL
            ORDER BY "updatedAt" DESC;
        `;
        const { rows, rowCount } = await client.query(query);

        if (rowCount === 0) {
            console.log('⚠️ No system-level configurations (where userId is NULL) found in the database.');
        } else {
            console.log(`✅ Found ${rowCount} system-level configuration(s):`);
            console.table(rows);
            // You can uncomment the line below to see the full 'value' object for the first result
            // if (rows[0]) {
            //     console.log('🔍 Full value of the most recent config:', rows[0].value);
            // }
        }
    } catch (error) {
        console.error('❌ An error occurred while querying the database:', error);
    } finally {
        client.release();
        await pool.end();
        console.log('👋 Database connection closed.');
    }
};

checkSystemConfigs().catch((err) => {
    console.error('An unexpected error occurred:', err);
    process.exit(1);
});
