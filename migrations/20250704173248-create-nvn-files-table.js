'use strict';

const TABLE_NAME = 'nvn_files';

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
            originalName: {
                type: Sequelize.STRING,
                allowNull: false,
                field: 'originalName',
            },
            storedName: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
                field: 'storedName',
            },
            url: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            cdnUrl: {
                type: Sequelize.STRING,
                allowNull: true,
                field: 'cdnUrl',
            },
            fileType: {
                type: Sequelize.ENUM(
                    'font_file',
                    'font_thumbnail',
                    'font_gallery',
                    'collection_cover',
                    'collection_zip',
                    'avatar',
                    'icon',
                    'document',
                    'other',
                ),
                allowNull: false,
                field: 'fileType',
            },
            mimeType: {
                type: Sequelize.STRING,
                allowNull: false,
                field: 'mimeType',
            },
            extension: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            fileSize: {
                type: Sequelize.INTEGER,
                allowNull: false,
                field: 'fileSize',
            },
            status: {
                type: Sequelize.ENUM('uploading', 'ready', 'processing', 'error', 'deleted'),
                allowNull: false,
                defaultValue: 'uploading',
            },
            storagePath: {
                type: Sequelize.STRING,
                allowNull: true,
                field: 'storagePath',
            },
            storageProvider: {
                type: Sequelize.STRING,
                defaultValue: 'local',
                field: 'storageProvider',
            },
            fileHash: {
                type: Sequelize.STRING,
                allowNull: true,
                field: 'fileHash',
            },
            uploadedBy: {
                type: Sequelize.UUID,
                allowNull: true,
                field: 'uploadedBy',
                references: {
                    model: 'nvn_users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
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

        await queryInterface.addIndex(TABLE_NAME, ['fileType'], {
            name: 'nvn_files_file_type_idx',
        });

        await queryInterface.addIndex(TABLE_NAME, ['uploadedBy'], {
            name: 'nvn_files_uploaded_by_idx',
        });

        await queryInterface.addIndex(TABLE_NAME, ['deletedAt'], {
            name: 'nvn_files_deleted_at_idx',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable(TABLE_NAME);
    },
};
