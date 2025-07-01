'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface) {
    // First, ensure the uuid-ossp extension is enabled.
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // Then, alter the table to set a default value for the id column.
    await queryInterface.sequelize.query(`
      ALTER TABLE "query_configs"
      ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();
    `);
  },

  async down (queryInterface) {
    // To revert, we just remove the default value.
    // We don't disable the extension as it might be used by other tables.
    await queryInterface.sequelize.query(`
      ALTER TABLE "query_configs"
      ALTER COLUMN "id" DROP DEFAULT;
    `);
  }
};
