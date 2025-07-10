'use strict';

const TABLE_NAME = 'nvn_key_rotation_history';

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
            oldKeyId: {
                type: Sequelize.UUID,
                allowNull: true,
                field: 'oldKeyId',
                references: {
                    model: 'nvn_security_keys',
                    key: 'keyId',
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
            },
            newKeyId: {
                type: Sequelize.UUID,
                allowNull: false,
                field: 'newKeyId',
                references: {
                    model: 'nvn_security_keys',
                    key: 'keyId',
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
            },
            keyType: {
                type: Sequelize.ENUM(
                    'access_token',
                    'refresh_token',
                    'email_verification',
                    'password_reset',
                    'api_key',
                    'webhook_signature',
                    'file_encryption',
                    'database_encryption',
                    'session_encryption',
                ),
                allowNull: false,
                field: 'keyType',
            },
            rotationType: {
                type: Sequelize.ENUM('scheduled', 'emergency', 'manual', 'compromised', 'expired'),
                allowNull: false,
                field: 'rotationType',
            },
            rotationReason: {
                type: Sequelize.TEXT,
                allowNull: true,
                field: 'rotationReason',
            },
            rotatedBy: {
                type: Sequelize.STRING(100),
                allowNull: true,
                field: 'rotatedBy',
            },
            rotatedFromMachine: {
                type: Sequelize.STRING(32),
                allowNull: false,
                field: 'rotatedFromMachine',
            },
            rotationDurationSeconds: {
                type: Sequelize.INTEGER,
                allowNull: true,
                field: 'rotationDurationSeconds',
            },
            affectedTokensCount: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
                field: 'affectedTokensCount',
            },
            rotationSuccess: {
                type: Sequelize.BOOLEAN,
                defaultValue: true,
                field: 'rotationSuccess',
            },
            errorDetails: {
                type: Sequelize.TEXT,
                allowNull: true,
                field: 'errorDetails',
            },
            metadata: {
                type: Sequelize.JSONB,
                defaultValue: {},
            },
            rotatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
                field: 'rotatedAt',
            },
        });

        await queryInterface.addIndex(TABLE_NAME, ['keyType', 'rotatedAt'], {
            name: 'nvn_key_rotation_history_key_type_rotated_at_idx',
        });

        await queryInterface.addIndex(TABLE_NAME, ['oldKeyId'], {
            name: 'nvn_key_rotation_history_old_key_id_idx',
        });

        await queryInterface.addIndex(TABLE_NAME, ['newKeyId'], {
            name: 'nvn_key_rotation_history_new_key_id_idx',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable(TABLE_NAME);
    },
};
