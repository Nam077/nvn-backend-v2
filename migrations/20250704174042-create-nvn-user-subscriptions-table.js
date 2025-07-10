'use strict';

const TABLE_NAME = 'nvn_user_subscriptions';

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
            planId: {
                type: Sequelize.UUID,
                allowNull: false,
                field: 'planId',
                references: {
                    model: 'nvn_subscription_plans',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT',
            },
            durationId: {
                type: Sequelize.UUID,
                allowNull: false,
                field: 'durationId',
                references: {
                    model: 'nvn_subscription_durations',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'RESTRICT',
            },
            startedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                field: 'startedAt',
            },
            expiresAt: {
                type: Sequelize.DATE,
                allowNull: false,
                field: 'expiresAt',
            },
            status: {
                type: Sequelize.ENUM('pending', 'active', 'cancelled', 'expired', 'failed'),
                allowNull: false,
                defaultValue: 'active',
            },
            paidAmount: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false,
                field: 'paidAmount',
            },
            paymentMethod: {
                type: Sequelize.STRING,
                allowNull: true,
                field: 'paymentMethod',
            },
            transactionId: {
                type: Sequelize.STRING,
                allowNull: true,
                field: 'transactionId',
            },
            autoRenew: {
                type: Sequelize.BOOLEAN,
                defaultValue: false,
                field: 'autoRenew',
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

        await queryInterface.addIndex(TABLE_NAME, ['userId'], {
            name: 'nvn_user_subscriptions_user_id_idx',
        });

        await queryInterface.addIndex(TABLE_NAME, ['status'], {
            name: 'nvn_user_subscriptions_status_idx',
        });

        await queryInterface.addIndex(TABLE_NAME, ['expiresAt'], {
            name: 'nvn_user_subscriptions_expires_at_idx',
        });

        await queryInterface.addIndex(TABLE_NAME, ['deletedAt'], {
            name: 'nvn_user_subscriptions_deleted_at_idx',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable(TABLE_NAME);
    },
};
