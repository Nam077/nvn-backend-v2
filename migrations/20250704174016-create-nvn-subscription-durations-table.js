'use strict';

const TABLE_NAME = 'nvn_subscription_durations';

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
            planId: {
                type: Sequelize.UUID,
                allowNull: false,
                field: 'planId',
                references: {
                    model: 'nvn_subscription_plans',
                    key: 'id',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            durationDays: {
                type: Sequelize.INTEGER,
                allowNull: false,
                field: 'duration_days',
            },
            price: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false,
            },
            discountPercentage: {
                type: Sequelize.DECIMAL(5, 4),
                defaultValue: 0,
                field: 'discount_percentage',
            },
            isActive: {
                type: Sequelize.BOOLEAN,
                defaultValue: true,
                field: 'isActive',
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

        await queryInterface.addIndex(TABLE_NAME, ['planId'], {
            name: 'nvn_subscription_durations_plan_id_idx',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable(TABLE_NAME);
    },
};
