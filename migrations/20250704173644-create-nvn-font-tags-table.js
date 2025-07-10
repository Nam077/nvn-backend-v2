'use strict';

const TABLE_NAME = 'nvn_font_tags';

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
            tagId: {
                type: Sequelize.UUID,
                primaryKey: true,
                allowNull: false,
                field: 'tagId',
                references: {
                    model: 'nvn_tags',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
        });

        // await queryInterface.addIndex(TABLE_NAME, ['fontId', 'tagId'], {
        //     name: 'nvn_font_tags_pkey',
        //     unique: true,
        // });
    },

    async down(queryInterface) {
        await queryInterface.dropTable(TABLE_NAME);
    },
};
