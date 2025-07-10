'use strict';

const TABLE_NAME = 'nvn_user_roles';

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
            userId: {
                type: Sequelize.UUID,
                allowNull: false,
                field: 'userId',
                references: {
                    model: 'nvn_users',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
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
            assignedAt: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW,
                field: 'assignedAt',
            },
            expiresAt: {
                type: Sequelize.DATE,
                allowNull: true,
                field: 'expiresAt',
            },
            assignedBy: {
                type: Sequelize.UUID,
                allowNull: true,
                field: 'assignedBy',
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
            fields: ['userId', 'roleId'],
            type: 'unique',
            name: 'nvn_user_roles_user_id_role_id_unique',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable(TABLE_NAME);
    },
};
