'use strict';

const TABLE_NAME = 'nvn_font_categories';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable(TABLE_NAME, {
            fontId: {
                type: Sequelize.UUID,
                primaryKey: true,
                allowNull: false,
                field: 'fontId',
                references: {
                    model: 'nvn_fonts',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            categoryId: {
                type: Sequelize.UUID,
                primaryKey: true,
                allowNull: false,
                field: 'categoryId',
                references: {
                    model: 'nvn_categories',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            isPrimary: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
                field: 'isPrimary',
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
                field: 'createdAt',
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
                field: 'updatedAt',
            },
        });

        // await queryInterface.addIndex(TABLE_NAME, ['fontId', 'categoryId'], {
        //     name: 'nvn_font_categories_pkey',
        //     unique: true,
        // });
    },

    async down(queryInterface) {
        await queryInterface.dropTable(TABLE_NAME);
    },
};
