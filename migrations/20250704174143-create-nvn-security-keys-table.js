'use strict';

const TABLE_NAME = 'nvn_security_keys';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable(TABLE_NAME, {
            keyId: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.literal('gen_random_uuid()'),
                primaryKey: true,
                allowNull: false,
                field: 'keyId',
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
            algorithm: {
                type: Sequelize.ENUM('RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512', 'HS256', 'HS384', 'HS512'),
                allowNull: false,
                field: 'algorithm',
            },
            encryptedPrivateKey: {
                type: Sequelize.TEXT,
                allowNull: false,
                field: 'encryptedPrivateKey',
            },
            encryptedPublicKey: {
                type: Sequelize.TEXT,
                allowNull: true,
                field: 'encryptedPublicKey',
            },
            creationTimestamp: {
                type: Sequelize.BIGINT,
                allowNull: false,
                field: 'creationTimestamp',
            },
            randomSalt: {
                type: Sequelize.BLOB,
                allowNull: false,
                field: 'randomSalt',
            },
            integritySignature: {
                type: Sequelize.STRING(128),
                allowNull: false,
                field: 'integritySignature',
            },
            status: {
                type: Sequelize.ENUM('pending', 'active', 'rotating', 'revoked', 'expired', 'compromised'),
                defaultValue: 'pending',
            },
            expiresAt: {
                type: Sequelize.DATE,
                allowNull: false,
                field: 'expiresAt',
            },
            activatedAt: {
                type: Sequelize.DATE,
                allowNull: true,
                field: 'activatedAt',
            },
            revokedAt: {
                type: Sequelize.DATE,
                allowNull: true,
                field: 'revokedAt',
            },
            revocationReason: {
                type: Sequelize.TEXT,
                allowNull: true,
                field: 'revocationReason',
            },
            encryptionVersion: {
                type: Sequelize.INTEGER,
                defaultValue: 1,
                field: 'encryptionVersion',
            },
            metadata: {
                type: Sequelize.JSONB,
                defaultValue: {},
            },
            createdBy: {
                type: Sequelize.STRING(100),
                allowNull: true,
                field: 'createdBy',
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

        await queryInterface.addIndex(TABLE_NAME, ['keyType', 'status'], {
            name: 'nvn_security_keys_key_type_status_idx',
        });

        await queryInterface.addIndex(TABLE_NAME, ['status', 'expiresAt'], {
            name: 'nvn_security_keys_status_expires_at_idx',
        });

        await queryInterface.addIndex(TABLE_NAME, ['deletedAt'], {
            name: 'nvn_security_keys_deleted_at_idx',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable(TABLE_NAME);
    },
};
