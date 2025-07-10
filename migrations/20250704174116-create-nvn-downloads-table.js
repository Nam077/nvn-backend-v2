'use strict';

const TABLE_NAME = 'nvn_downloads';

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
            userId: {
                type: Sequelize.UUID,
                allowNull: true,
                field: 'userId',
                references: {
                    model: 'nvn_users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            itemId: {
                type: Sequelize.UUID,
                allowNull: false,
                field: 'itemId',
            },
            itemType: {
                type: Sequelize.ENUM('font', 'collection'),
                allowNull: false,
                field: 'itemType',
            },
            ipAddress: {
                type: Sequelize.STRING,
                allowNull: false,
                field: 'ip_address',
            },
            userAgent: {
                type: Sequelize.TEXT,
                allowNull: true,
                field: 'user_agent',
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

        await queryInterface.addIndex(TABLE_NAME, ['userId'], {
            name: 'nvn_downloads_user_id_idx',
        });

        await queryInterface.addIndex(TABLE_NAME, ['itemId', 'itemType'], {
            name: 'nvn_downloads_item_idx',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable(TABLE_NAME);
    },
};
