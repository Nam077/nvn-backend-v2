import { ApiProperty } from '@nestjs/swagger';

import {
    Column,
    CreatedAt,
    DataType,
    Model,
    PrimaryKey,
    Table,
    ForeignKey,
    BelongsTo,
    Index,
} from 'sequelize-typescript';

import { SecurityKey } from './security-key.entity';
import { KeyType } from '../types/key.types';

@Table({
    tableName: 'key_rotation_history',
    underscored: true,
    indexes: [
        { fields: ['key_type', 'rotated_at'] },
        { fields: ['rotation_type'] },
        { fields: ['old_key_id'] },
        { fields: ['new_key_id'] },
    ],
})
export class KeyRotationHistory extends Model<KeyRotationHistory, KeyRotationHistoryCreationAttrs> {
    @ApiProperty({ description: 'Rotation history ID' })
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
    })
    declare id: string;

    @ApiProperty({ description: 'Old key ID that was rotated' })
    @ForeignKey(() => SecurityKey)
    @Index
    @Column({
        type: DataType.STRING(128),
        allowNull: true,
    })
    declare oldKeyId: string;

    @ApiProperty({ description: 'New key ID after rotation' })
    @ForeignKey(() => SecurityKey)
    @Index
    @Column({
        type: DataType.STRING(128),
        allowNull: false,
    })
    declare newKeyId: string;

    @ApiProperty({ description: 'Type of key being rotated' })
    @Index
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

    @ApiProperty({ description: 'Type of rotation', example: 'scheduled' })
    @Index
    @Column({
        type: DataType.ENUM('scheduled', 'emergency', 'manual', 'compromised', 'expired'),
        allowNull: false,
    })
    declare rotationType: 'scheduled' | 'emergency' | 'manual' | 'compromised' | 'expired';

    @ApiProperty({ description: 'Reason for rotation' })
    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    declare rotationReason: string;

    @ApiProperty({ description: 'User who initiated rotation' })
    @Column({
        type: DataType.STRING(100),
        allowNull: true,
    })
    declare rotatedBy: string;

    @ApiProperty({ description: 'Machine where rotation was initiated' })
    @Column({
        type: DataType.STRING(32),
        allowNull: false,
    })
    declare rotatedFromMachine: string;

    @ApiProperty({ description: 'Duration of rotation process in seconds' })
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare rotationDurationSeconds: number;

    @ApiProperty({ description: 'Number of affected tokens/sessions' })
    @Column({
        type: DataType.INTEGER,
        defaultValue: 0,
    })
    declare affectedTokensCount: number;

    @ApiProperty({ description: 'Success status of rotation' })
    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    declare rotationSuccess: boolean;

    @ApiProperty({ description: 'Error details if rotation failed' })
    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    declare errorDetails: string;

    @ApiProperty({ description: 'Additional metadata for rotation' })
    @Column({
        type: DataType.JSONB,
        defaultValue: {},
    })
    declare metadata: Record<string, any>;

    @ApiProperty({ description: 'When rotation was completed' })
    @CreatedAt
    declare rotatedAt: Date;

    // Associations
    @BelongsTo(() => SecurityKey, 'oldKeyId')
    declare oldKey: SecurityKey;

    @BelongsTo(() => SecurityKey, 'newKeyId')
    declare newKey: SecurityKey;

    // Virtual properties
    @ApiProperty({ description: 'Human readable rotation duration' })
    get rotationDurationDisplay(): string {
        if (!this.rotationDurationSeconds) return 'Unknown';

        const minutes = Math.floor(this.rotationDurationSeconds / 60);
        const seconds = this.rotationDurationSeconds % 60;

        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;
    }
}

export interface KeyRotationHistoryCreationAttrs {
    oldKeyId?: string;
    newKeyId: string;
    keyType: KeyType;
    rotationType: 'scheduled' | 'emergency' | 'manual' | 'compromised' | 'expired';
    rotationReason?: string;
    rotatedBy?: string;
    rotatedFromMachine: string;
    rotationDurationSeconds?: number;
    affectedTokensCount?: number;
    rotationSuccess?: boolean;
    errorDetails?: string;
    metadata?: Record<string, any>;
}
