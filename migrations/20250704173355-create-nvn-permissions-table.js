'use strict';

const TABLE_NAME = 'nvn_permissions';

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
                unique: true,
            },
            description: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            resource: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            action: {
                type: Sequelize.STRING,
                allowNull: false,
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
        });

        // await queryInterface.addIndex(TABLE_NAME, ['name'], {
        //     name: 'nvn_permissions_name_key',
        //     unique: true,
        // });

        await queryInterface.addIndex(TABLE_NAME, ['resource', 'action'], {
            name: 'nvn_permissions_resource_action_idx',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable(TABLE_NAME);
    },
};
