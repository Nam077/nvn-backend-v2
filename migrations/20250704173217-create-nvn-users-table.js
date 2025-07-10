'use strict';

const TABLE_NAME = 'nvn_users';

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
            email: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
            },
            password: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            firstName: {
                type: Sequelize.STRING,
                allowNull: true,
                field: 'firstName',
            },
            lastName: {
                type: Sequelize.STRING,
                allowNull: true,
                field: 'lastName',
            },
            isActive: {
                type: Sequelize.BOOLEAN,
                defaultValue: true,
                allowNull: false,
                field: 'isActive',
            },
            emailVerified: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
                allowNull: false,
                field: 'emailVerified',
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

        // await queryInterface.addIndex(TABLE_NAME, ['email'], {
        //     name: 'nvn_users_email_key',
        //     unique: true,
        // });

        await queryInterface.addIndex(TABLE_NAME, ['isActive'], {
            name: 'nvn_users_is_active_idx',
        });

        await queryInterface.addIndex(TABLE_NAME, ['deletedAt'], {
            name: 'nvn_users_deleted_at_idx',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable(TABLE_NAME);
    },
};
