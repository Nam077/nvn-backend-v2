'use strict';

const TABLE_NAME = 'nvn_collection_categories';

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
        });

        // await queryInterface.addIndex(TABLE_NAME, ['collectionId', 'categoryId'], {
        //     name: 'nvn_collection_categories_pkey',
        //     unique: true,
        // });
    },

    async down(queryInterface) {
        await queryInterface.dropTable(TABLE_NAME);
    },
};
