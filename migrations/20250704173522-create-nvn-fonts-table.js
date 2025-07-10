'use strict';

const TABLE_NAME = 'nvn_fonts';

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
            authors: {
                type: Sequelize.JSONB,
                defaultValue: [],
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true,
            },
            thumbnailFileId: {
                type: Sequelize.UUID,
                allowNull: true,
                field: 'thumbnailFileId',
                references: {
                    model: 'nvn_files',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            thumbnailUrl: {
                type: Sequelize.STRING,
                allowNull: true,
                field: 'thumbnailUrl',
            },
            galleryImages: {
                type: Sequelize.JSONB,
                defaultValue: [],
                field: 'galleryImages',
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
            fontType: {
                type: Sequelize.ENUM('free', 'vip', 'paid'),
                allowNull: false,
                defaultValue: 'free',
                field: 'fontType',
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
            isSupportVietnamese: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
                field: 'isSupportVietnamese',
            },
            metadata: {
                type: Sequelize.JSONB,
                defaultValue: {},
            },
            previewText: {
                type: Sequelize.TEXT,
                allowNull: true,
                field: 'previewText',
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

        await queryInterface.addIndex(TABLE_NAME, ['creatorId'], {
            name: 'nvn_fonts_creator_id_idx',
        });

        await queryInterface.addIndex(TABLE_NAME, ['isActive'], {
            name: 'nvn_fonts_is_active_idx',
        });

        await queryInterface.addIndex(TABLE_NAME, ['fontType'], {
            name: 'nvn_fonts_font_type_idx',
        });

        await queryInterface.addIndex(TABLE_NAME, ['deletedAt'], {
            name: 'nvn_fonts_deleted_at_idx',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable(TABLE_NAME);
    },
};
