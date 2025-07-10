import { ApiProperty } from '@nestjs/swagger';

import { values } from 'lodash';
import {
    BelongsTo,
    Column,
    CreatedAt,
    DataType,
    DeletedAt,
    ForeignKey,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt,
} from 'sequelize-typescript';

import { User } from '@/modules/users/entities/user.entity';

export const PURCHASE_STATUS = {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded',
} as const;

export type PurchaseStatus = (typeof PURCHASE_STATUS)[keyof typeof PURCHASE_STATUS];

export const ITEM_TYPE = {
    FONT: 'font',
    COLLECTION: 'collection',
} as const;

export type ItemType = (typeof ITEM_TYPE)[keyof typeof ITEM_TYPE];

@Table({
    tableName: 'nvn_purchases',
    timestamps: true,
    paranoid: true,
})
export class Purchase extends Model<Purchase, PurchaseCreationAttrs> {
    @ApiProperty({ description: 'Purchase ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        field: 'id',
    })
    declare id: string;

    @ApiProperty({ description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ForeignKey(() => User)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'userId',
    })
    declare userId: string;

    @ApiProperty({ description: 'Item ID (Font or Collection)', example: '123e4567-e89b-12d3-a456-426614174000' })
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'itemId',
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
        field: 'itemType',
    })
    declare itemType: ItemType;

    @ApiProperty({ description: 'Amount paid in VND', example: 50000 })
    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
        field: 'amount',
    })
    declare amount: number;

    @ApiProperty({ description: 'Payment method', example: 'credit_card' })
    @Column({
        type: DataType.STRING,
        allowNull: false,
        field: 'paymentMethod',
    })
    declare paymentMethod: string;

    @ApiProperty({
        description: 'Purchase status',
        example: 'completed',
        enum: values(PURCHASE_STATUS),
    })
    @Column({
        type: DataType.ENUM(...values(PURCHASE_STATUS)),
        allowNull: false,
        defaultValue: PURCHASE_STATUS.PENDING,
        field: 'status',
    })
    declare status: PurchaseStatus;

    @ApiProperty({ description: 'Transaction ID', example: 'txn_1234567890' })
    @Column({
        type: DataType.STRING,
        allowNull: true,
        field: 'transactionId',
    })
    declare transactionId: string;

    @ApiProperty({ description: 'Payment metadata', example: '{"gateway": "stripe", "charge_id": "ch_123"}' })
    @Column({
        type: DataType.JSONB,
        defaultValue: {},
        field: 'paymentMetadata',
    })
    declare paymentMetadata: Record<string, any>;

    @ApiProperty({ description: 'Creation date' })
    @CreatedAt
    @Column({ field: 'createdAt' })
    declare createdAt: Date;

    @ApiProperty({ description: 'Last update date' })
    @UpdatedAt
    @Column({ field: 'updatedAt' })
    declare updatedAt: Date;

    @DeletedAt
    @Column({ field: 'deletedAt' })
    declare deletedAt: Date;

    // Associations
    @BelongsTo(() => User)
    declare user: User;

    // Virtual properties
    @ApiProperty({ description: 'Is purchase completed', example: true })
    get isCompleted(): boolean {
        return this.status === PURCHASE_STATUS.COMPLETED;
    }

    @ApiProperty({ description: 'Is purchase pending', example: false })
    get isPending(): boolean {
        return this.status === PURCHASE_STATUS.PENDING;
    }

    @ApiProperty({ description: 'Is purchase failed', example: false })
    get isFailed(): boolean {
        return this.status === PURCHASE_STATUS.FAILED;
    }

    @ApiProperty({ description: 'Is purchase refunded', example: false })
    get isRefunded(): boolean {
        return this.status === PURCHASE_STATUS.REFUNDED;
    }

    @ApiProperty({ description: 'Is font purchase', example: true })
    get isFontPurchase(): boolean {
        return this.itemType === ITEM_TYPE.FONT;
    }

    @ApiProperty({ description: 'Is collection purchase', example: false })
    get isCollectionPurchase(): boolean {
        return this.itemType === ITEM_TYPE.COLLECTION;
    }
}

export interface PurchaseCreationAttrs {
    userId: string;
    itemId: string;
    itemType: ItemType;
    amount: number;
    paymentMethod: string;
    status?: PurchaseStatus;
    transactionId?: string;
    paymentMetadata?: Record<string, any>;
}
