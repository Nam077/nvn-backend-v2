'use strict';

const TABLE_NAME = 'nvn_roles';

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
            name: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
            },
            displayName: {
                type: Sequelize.STRING,
                allowNull: false,
                field: 'displayName',
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            isActive: {
                type: Sequelize.BOOLEAN,
                defaultValue: true,
                allowNull: false,
                field: 'isActive',
            },
            priority: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            isSystem: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
                allowNull: false,
                field: 'isSystem',
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
            deletedAt: {
                type: Sequelize.DATE,
                allowNull: true,
                field: 'deletedAt',
            },
        });

        await queryInterface.addIndex(TABLE_NAME, ['isActive'], {
            name: 'nvn_roles_is_active_idx',
        });

        await queryInterface.addIndex(TABLE_NAME, ['deletedAt'], {
            name: 'nvn_roles_deleted_at_idx',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable(TABLE_NAME);
    },
};
