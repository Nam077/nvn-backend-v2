'use strict';

const TABLE_NAME = 'nvn_collection_fonts';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable(TABLE_NAME, {
            collectionId: {
                type: Sequelize.UUID,
                primaryKey: true,
                allowNull: false,
                field: 'collectionId',
                references: {
                    model: 'nvn_collections',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
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
            sortOrder: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
                field: 'sortOrder',
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

        // await queryInterface.addIndex(TABLE_NAME, ['collectionId', 'fontId'], {
        //     name: 'nvn_collection_fonts_pkey',
        //     unique: true,
        // });
    },

    async down(queryInterface) {
        await queryInterface.dropTable(TABLE_NAME);
    },
};
