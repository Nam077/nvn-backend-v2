'use strict';

const TABLE_NAME = 'nvn_categories';

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
            iconUrl: {
                type: Sequelize.STRING,
                allowNull: true,
                field: 'iconUrl',
            },
            parentId: {
                type: Sequelize.UUID,
                allowNull: true,
                field: 'parentId',
                references: {
                    model: TABLE_NAME,
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            level: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            path: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
            },
            sortOrder: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
                allowNull: false,
                field: 'sortOrder',
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

        // await queryInterface.addIndex(TABLE_NAME, ['slug'], {
        //     name: 'nvn_categories_slug_key',
        //     unique: true,
        // });

        // await queryInterface.addIndex(TABLE_NAME, ['path'], {
        //     name: 'nvn_categories_path_key',
        //     unique: true,
        // });

        await queryInterface.addIndex(TABLE_NAME, ['parentId'], {
            name: 'nvn_categories_parent_id_idx',
        });

        await queryInterface.addIndex(TABLE_NAME, ['isActive'], {
            name: 'nvn_categories_is_active_idx',
        });

        await queryInterface.addIndex(TABLE_NAME, ['deletedAt'], {
            name: 'nvn_categories_deleted_at_idx',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable(TABLE_NAME);
    },
};
