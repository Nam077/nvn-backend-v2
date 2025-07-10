'use strict';

const TABLE_NAME = 'nvn_collections';

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
            coverImageUrl: {
                type: Sequelize.STRING,
                allowNull: true,
                field: 'coverImageUrl',
            },
            creatorId: {
                type: Sequelize.UUID,
                allowNull: false,
                field: 'creatorId',
                references: {
                    model: 'nvn_users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            collectionType: {
                type: Sequelize.ENUM('free', 'vip', 'paid'),
                allowNull: false,
                defaultValue: 'free',
                field: 'collectionType',
            },
            price: {
                type: Sequelize.DECIMAL(10, 2),
                defaultValue: 0,
            },
            downloadCount: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
                field: 'downloadCount',
            },
            isActive: {
                type: Sequelize.BOOLEAN,
                defaultValue: true,
                field: 'isActive',
            },
            metadata: {
                type: Sequelize.JSONB,
                defaultValue: {},
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
        //     name: 'nvn_collections_slug_key',
        //     unique: true,
        // });

        await queryInterface.addIndex(TABLE_NAME, ['creatorId'], {
            name: 'nvn_collections_creator_id_idx',
        });

        await queryInterface.addIndex(TABLE_NAME, ['isActive'], {
            name: 'nvn_collections_is_active_idx',
        });

        await queryInterface.addIndex(TABLE_NAME, ['deletedAt'], {
            name: 'nvn_collections_deleted_at_idx',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable(TABLE_NAME);
    },
};
