'use strict';

const TABLE_NAME = 'nvn_role_permissions';

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
            roleId: {
                type: Sequelize.UUID,
                allowNull: false,
                field: 'roleId',
                references: {
                    model: 'nvn_roles',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            permissionId: {
                type: Sequelize.UUID,
                allowNull: false,
                field: 'permissionId',
                references: {
                    model: 'nvn_permissions',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            grantedAt: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW,
                field: 'grantedAt',
            },
            grantedBy: {
                type: Sequelize.UUID,
                allowNull: true,
                field: 'grantedBy',
                references: {
                    model: 'nvn_users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
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
        });

        await queryInterface.addConstraint(TABLE_NAME, {
            fields: ['roleId', 'permissionId'],
            type: 'unique',
            name: 'nvn_role_permissions_role_id_permission_id_unique',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable(TABLE_NAME);
    },
};
