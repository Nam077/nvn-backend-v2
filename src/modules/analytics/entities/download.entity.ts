import { ApiProperty } from '@nestjs/swagger';

import { includes, values } from 'lodash';
import { BelongsTo, Column, CreatedAt, DataType, ForeignKey, Model, PrimaryKey, Table } from 'sequelize-typescript';

import { User } from '@/modules/users/entities/user.entity';

export const ITEM_TYPE = {
    FONT: 'font',
    COLLECTION: 'collection',
} as const;

export type ItemType = (typeof ITEM_TYPE)[keyof typeof ITEM_TYPE];

@Table({
    tableName: 'downloads',
    underscored: true,
    timestamps: true,
    updatedAt: false,
})
export class Download extends Model<Download, DownloadCreationAttrs> {
    @ApiProperty({ description: 'Download ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
    })
    declare id: string;

    @ApiProperty({ description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ForeignKey(() => User)
    @Column({
        type: DataType.UUID,
        allowNull: true, // Allow anonymous downloads
    })
    declare userId: string;

    @ApiProperty({ description: 'Item ID (Font or Collection)', example: '123e4567-e89b-12d3-a456-426614174000' })
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare itemId: string;

    @ApiProperty({
        description: 'Item type',
        example: 'font',
        enum: values(ITEM_TYPE),
    })
    @Column({
        type: DataType.ENUM(...values(ITEM_TYPE)),
        allowNull: false,
    })
    declare itemType: ItemType;

    @ApiProperty({ description: 'IP address of downloader', example: '192.168.1.1' })
    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare ipAddress: string;

    @ApiProperty({ description: 'User agent string', example: 'Mozilla/5.0...' })
    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    declare userAgent: string;

    @ApiProperty({ description: 'Download date' })
    @CreatedAt
    declare createdAt: Date;

    // Associations
    @BelongsTo(() => User)
    declare user: User;

    // Virtual properties
    @ApiProperty({ description: 'Is font download', example: true })
    get isFontDownload(): boolean {
        return this.itemType === ITEM_TYPE.FONT;
    }

    @ApiProperty({ description: 'Is collection download', example: false })
    get isCollectionDownload(): boolean {
        return this.itemType === ITEM_TYPE.COLLECTION;
    }

    @ApiProperty({ description: 'Is anonymous download', example: false })
    get isAnonymous(): boolean {
        return !this.userId;
    }

    @ApiProperty({ description: 'Browser from user agent', example: 'Chrome' })
    get browser(): string {
        if (!this.userAgent) return 'Unknown';

        if (includes(this.userAgent, 'Chrome')) return 'Chrome';
        if (includes(this.userAgent, 'Firefox')) return 'Firefox';
        if (includes(this.userAgent, 'Safari')) return 'Safari';
        if (includes(this.userAgent, 'Edge')) return 'Edge';

        return 'Other';
    }

    @ApiProperty({ description: 'Operating system from user agent', example: 'Windows' })
    get operatingSystem(): string {
        if (!this.userAgent) return 'Unknown';

        if (includes(this.userAgent, 'Windows')) return 'Windows';
        if (includes(this.userAgent, 'Mac OS')) return 'macOS';
        if (includes(this.userAgent, 'Linux')) return 'Linux';
        if (includes(this.userAgent, 'Android')) return 'Android';
        if (includes(this.userAgent, 'iOS')) return 'iOS';

        return 'Other';
    }
}

export interface DownloadCreationAttrs {
    userId?: string;
    itemId: string;
    itemType: ItemType;
    ipAddress: string;
    userAgent?: string;
}
