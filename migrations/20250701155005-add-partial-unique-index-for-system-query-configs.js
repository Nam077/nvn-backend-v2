'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface) {
    // We use CONCURRENTLY to avoid locking the table during index creation.
    // IF NOT EXISTS prevents an error if the index already exists.
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "query_configs_key_system_unique_idx"
      ON "query_configs" ("key")
      WHERE "userId" IS NULL;
    `);
  },

  async down (queryInterface) {
    // We use CONCURRENTLY here as well for consistency.
    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS "query_configs_key_system_unique_idx";
    `);
  }
};
