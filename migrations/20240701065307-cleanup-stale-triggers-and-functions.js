'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        console.log('--- CLEANING UP STALE TRIGGERS AND FUNCTIONS ---');

        const allTables = [
            'fonts',
            'font_categories',
            'font_tags',
            'font_weights',
            'categories',
            'tags',
            'users',
            'files',
            'font_update_queue',
        ];

        console.log('Dropping known triggers...');
        for (const table of allTables) {
            // Drop old and new triggers by known names
            await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS trigger_queue_update ON "${table}" CASCADE;`).catch(e => console.log(e.message));
            await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS trigger_notify_new_task ON "${table}" CASCADE;`).catch(e => console.log(e.message));
            await queryInterface.sequelize.query(`DROP TRIGGER IF EXISTS fonts_update_trigger ON "${table}" CASCADE;`).catch(e => console.log(e.message));
        }

        const functionsToCleanup = [
            'queue_font_update_from_master',
            'process_font_update_queue',
            'process_font_update_queue_enhanced',
            'queue_master_table_update',
            'queue_single_font_update',
            'queue_linking_table_update',
            'get_queue_health',
            'cleanup_failed_tasks',
            'run_queue_processor',
            'emergency_queue_reset',
            'upsert_font_search_index',
            'notify_new_queue_task',
            'queue_font_update', // The old function causing issues
        ];

        console.log('Dropping known functions...');
        for (const funcName of functionsToCleanup) {
            await queryInterface.sequelize.query(`DROP FUNCTION IF EXISTS ${funcName}() CASCADE;`).catch(e => console.log(e.message));
        }

        console.log('--- CLEANUP COMPLETE ---');
    },

    async down(queryInterface) {
        // This is a one-way cleanup migration, no rollback needed.
        console.log('No rollback for cleanup migration.');
    },
}; 