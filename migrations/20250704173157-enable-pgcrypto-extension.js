'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface) {
    // The pgcrypto extension provides cryptographic functions for PostgreSQL.
    // We need it to use gen_random_uuid() for our primary keys.
    // Using "IF NOT EXISTS" ensures the migration is safe to run multiple times.
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
  },

  async down (queryInterface) {
    // It's generally safe to leave the extension enabled,
    // but for completeness, we can add a down migration.
    // Be cautious running this in production if other parts of the DB use it.
    await queryInterface.sequelize.query('DROP EXTENSION IF EXISTS "pgcrypto";');
  }
};
