'use strict';

const TABLE_NAME = 'nvn_tags';

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
            slug: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
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
            name: 'nvn_tags_is_active_idx',
        });

        await queryInterface.addIndex(TABLE_NAME, ['deletedAt'], {
            name: 'nvn_tags_deleted_at_idx',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable(TABLE_NAME);
    },
};
