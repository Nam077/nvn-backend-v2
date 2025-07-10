'use strict';

const TABLE_NAME = 'nvn_purchases';

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
            itemId: {
                type: Sequelize.UUID,
                allowNull: false,
                field: 'itemId',
            },
            itemType: {
                type: Sequelize.ENUM('font', 'collection'),
                allowNull: false,
                field: 'itemType',
            },
            amount: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false,
            },
            paymentMethod: {
                type: Sequelize.STRING,
                allowNull: false,
                field: 'paymentMethod',
            },
            status: {
                type: Sequelize.ENUM('pending', 'completed', 'failed', 'refunded'),
                allowNull: false,
                defaultValue: 'pending',
            },
            transactionId: {
                type: Sequelize.STRING,
                allowNull: true,
                field: 'transactionId',
            },
            paymentMetadata: {
                type: Sequelize.JSONB,
                defaultValue: {},
                field: 'paymentMetadata',
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
            name: 'nvn_purchases_user_id_idx',
        });

        await queryInterface.addIndex(TABLE_NAME, ['itemId', 'itemType'], {
            name: 'nvn_purchases_item_idx',
        });

        await queryInterface.addIndex(TABLE_NAME, ['transactionId'], {
            name: 'nvn_purchases_transaction_id_idx',
            unique: true,
            where: {
                transactionId: {
                    [Sequelize.Op.ne]: null,
                },
            },
        });

        await queryInterface.addIndex(TABLE_NAME, ['deletedAt'], {
            name: 'nvn_purchases_deleted_at_idx',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable(TABLE_NAME);
    },
};
