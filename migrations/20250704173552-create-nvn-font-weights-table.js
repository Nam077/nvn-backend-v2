'use strict';

const TABLE_NAME = 'nvn_font_weights';

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
            fontId: {
                type: Sequelize.UUID,
                allowNull: false,
                field: 'fontId',
                references: {
                    model: 'nvn_fonts',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            weightName: {
                type: Sequelize.STRING,
                allowNull: false,
                field: 'weightName',
            },
            weightValue: {
                type: Sequelize.INTEGER,
                allowNull: false,
                field: 'weightValue',
            },
            fileId: {
                type: Sequelize.UUID,
                allowNull: false,
                field: 'fileId',
                references: {
                    model: 'nvn_files',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            isActive: {
                type: Sequelize.BOOLEAN,
                defaultValue: true,
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

        await queryInterface.addIndex(TABLE_NAME, ['fontId'], {
            name: 'nvn_font_weights_font_id_idx',
        });

        await queryInterface.addIndex(TABLE_NAME, ['fileId'], {
            name: 'nvn_font_weights_file_id_idx',
        });

        await queryInterface.addIndex(TABLE_NAME, ['isActive'], {
            name: 'nvn_font_weights_is_active_idx',
        });

        await queryInterface.addIndex(TABLE_NAME, ['deletedAt'], {
            name: 'nvn_font_weights_deleted_at_idx',
        });

        await queryInterface.addIndex(TABLE_NAME, ['fontId', 'weightValue'], {
            name: 'nvn_font_weights_font_id_weight_value_unique',
            unique: true,
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable(TABLE_NAME);
    },
};
