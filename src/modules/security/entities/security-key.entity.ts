import { ApiProperty } from '@nestjs/swagger';

import { Column, CreatedAt, DataType, Model, PrimaryKey, Table, UpdatedAt, Index } from 'sequelize-typescript';

import { KeyType, KeyAlgorithm, KeyStatus } from '../types/key.types';

@Table({
    tableName: 'security_keys',
    underscored: true,
    indexes: [{ fields: ['key_type', 'status'] }, { fields: ['status', 'expires_at'] }, { fields: ['created_at'] }],
})
export class SecurityKey extends Model<SecurityKey, SecurityKeyCreationAttrs> {
    @ApiProperty({ description: 'Key ID (UUID)', example: '550e8400-e29b-41d4-a716-446655440000' })
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        allowNull: false,
    })
    declare keyId: string;

    @ApiProperty({ description: 'Key type', example: 'access_token' })
    @Column({
        type: DataType.ENUM(
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
    })
    declare keyType: KeyType;

    @ApiProperty({ description: 'Algorithm', example: 'RS256' })
    @Column({
        type: DataType.ENUM('RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512', 'HS256', 'HS384', 'HS512'),
        allowNull: false,
    })
    declare algorithm: KeyAlgorithm;

    @ApiProperty({ description: 'Encrypted private key' })
    @Column({
        type: DataType.TEXT,
        allowNull: false,
    })
    declare encryptedPrivateKey: string;

    @ApiProperty({ description: 'Encrypted public key' })
    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    declare encryptedPublicKey: string;

    @ApiProperty({ description: 'Creation timestamp for key derivation' })
    @Column({
        type: DataType.BIGINT,
        allowNull: false,
    })
    declare creationTimestamp: number;

    @ApiProperty({ description: 'Random salt for key derivation' })
    @Column({
        type: DataType.BLOB,
        allowNull: false,
    })
    declare randomSalt: Buffer;

    @ApiProperty({ description: 'Integrity signature' })
    @Column({
        type: DataType.STRING(128),
        allowNull: false,
    })
    declare integritySignature: string;

    @ApiProperty({ description: 'Key status', example: 'active' })
    @Index
    @Column({
        type: DataType.ENUM('pending', 'active', 'rotating', 'revoked', 'expired', 'compromised'),
        defaultValue: 'pending',
    })
    declare status: KeyStatus;

    @ApiProperty({ description: 'Key expiration date' })
    @Index
    @Column({
        type: DataType.DATE,
        allowNull: false,
    })
    declare expiresAt: Date;

    @ApiProperty({ description: 'Date when key was activated' })
    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    declare activatedAt: Date;

    @ApiProperty({ description: 'Date when key was revoked' })
    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    declare revokedAt: Date;

    @ApiProperty({ description: 'Reason for revocation' })
    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    declare revocationReason: string;

    @ApiProperty({ description: 'Encryption version for migration' })
    @Column({
        type: DataType.INTEGER,
        defaultValue: 1,
    })
    declare encryptionVersion: number;

    @ApiProperty({ description: 'Additional metadata' })
    @Column({
        type: DataType.JSONB,
        defaultValue: {},
    })
    declare metadata: Record<string, any>;

    @ApiProperty({ description: 'User who created the key' })
    @Column({
        type: DataType.STRING(100),
        allowNull: true,
    })
    declare createdBy: string;

    @ApiProperty({ description: 'Last used timestamp' })
    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    declare lastUsedAt: Date;

    @ApiProperty({ description: 'Usage count' })
    @Column({
        type: DataType.INTEGER,
        defaultValue: 0,
    })
    declare usageCount: number;

    @ApiProperty({ description: 'Creation date' })
    @CreatedAt
    declare createdAt: Date;

    @ApiProperty({ description: 'Last update date' })
    @UpdatedAt
    declare updatedAt: Date;

    // Virtual properties
    @ApiProperty({ description: 'Is key currently active' })
    get isActive(): boolean {
        return this.status === 'active' && this.expiresAt > new Date();
    }

    @ApiProperty({ description: 'Days until expiration' })
    get daysUntilExpiration(): number {
        const now = new Date();
        const diffTime = this.expiresAt.getTime() - now.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    @ApiProperty({ description: 'Key age in days' })
    get ageInDays(): number {
        const now = new Date();
        const diffTime = now.getTime() - this.createdAt.getTime();
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }
}

export interface SecurityKeyCreationAttrs {
    keyType: KeyType;
    algorithm: KeyAlgorithm;
    encryptedPrivateKey: string;
    encryptedPublicKey?: string;
    creationTimestamp: number;
    randomSalt: Buffer;
    integritySignature: string;
    status?: KeyStatus;
    expiresAt: Date;
    metadata?: Record<string, any>;
    createdBy?: string;
}
