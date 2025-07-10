'use strict';

const TABLE_NAME = 'nvn_query_configs';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable(TABLE_NAME, {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal('gen_random_uuid()'),
                primaryKey: true,
                allowNull: false,
            },
            key: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            value: {
                type: Sequelize.JSONB,
                allowNull: false,
            },
            userId: {
                type: Sequelize.UUID,
                allowNull: true,
                field: 'userId',
                references: {
                    model: 'nvn_users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
                field: 'createdAt',
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
                field: 'updatedAt',
            },
        });

        // Add a partial unique index. A user can have one config for a key.
        // System configs have userId = NULL. There can be only one system default for a key.
        await queryInterface.addIndex(TABLE_NAME, ['key', 'userId'], {
            name: 'nvn_query_configs_key_user_id_unique',
            unique: true,
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable(TABLE_NAME);
    },
};
