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

import { SUBSCRIPTION_STATUS, SubscriptionStatus } from '@/modules/subscription/constants/subscription.constants';
import { SubscriptionDuration } from '@/modules/subscription/entities/subscription-duration.entity';
import { SubscriptionPlan } from '@/modules/subscription/entities/subscription-plan.entity';
import { User } from '@/modules/users/entities/user.entity';

@Table({
    tableName: 'nvn_user_subscriptions',
    timestamps: true,
    paranoid: true,
})
export class UserSubscription extends Model<UserSubscription, UserSubscriptionCreationAttrs> {
    @ApiProperty({ description: 'Subscription ID', example: '123e4567-e89b-12d3-a456-426614174000' })
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

    @ApiProperty({ description: 'Plan ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ForeignKey(() => SubscriptionPlan)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'planId',
    })
    declare planId: string;

    @ApiProperty({ description: 'Duration ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ForeignKey(() => SubscriptionDuration)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'durationId',
    })
    declare durationId: string;

    @ApiProperty({ description: 'Subscription start date' })
    @Column({
        type: DataType.DATE,
        allowNull: false,
        field: 'startedAt',
    })
    declare startedAt: Date;

    @ApiProperty({ description: 'Subscription expiry date' })
    @Column({
        type: DataType.DATE,
        allowNull: false,
        field: 'expiresAt',
    })
    declare expiresAt: Date;

    @ApiProperty({
        description: 'Subscription status',
        example: 'active',
        enum: values(SUBSCRIPTION_STATUS),
    })
    @Column({
        type: DataType.ENUM(...values(SUBSCRIPTION_STATUS)),
        allowNull: false,
        defaultValue: SUBSCRIPTION_STATUS.ACTIVE,
        field: 'status',
    })
    declare status: SubscriptionStatus;

    @ApiProperty({ description: 'Amount paid in VND', example: 99000 })
    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
        field: 'paidAmount',
    })
    declare paidAmount: number;

    @ApiProperty({ description: 'Payment method', example: 'credit_card' })
    @Column({
        type: DataType.STRING,
        allowNull: true,
        field: 'paymentMethod',
    })
    declare paymentMethod: string;

    @ApiProperty({ description: 'Payment transaction ID', example: 'txn_123456789' })
    @Column({
        type: DataType.STRING,
        allowNull: true,
        field: 'transactionId',
    })
    declare transactionId: string;

    @ApiProperty({ description: 'Auto renewal enabled', example: true })
    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
        field: 'autoRenew',
    })
    declare autoRenew: boolean;

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

    @BelongsTo(() => SubscriptionPlan)
    declare plan: SubscriptionPlan;

    @BelongsTo(() => SubscriptionDuration)
    declare duration: SubscriptionDuration;

    // Virtual properties
    @ApiProperty({ description: 'Is subscription currently active', example: true })
    get isActive(): boolean {
        return this.status === SUBSCRIPTION_STATUS.ACTIVE && new Date() < this.expiresAt;
    }

    @ApiProperty({ description: 'Days remaining until expiry', example: 15 })
    get daysRemaining(): number {
        if (!this.isActive) return 0;
        const now = new Date();
        const diffTime = this.expiresAt.getTime() - now.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    @ApiProperty({ description: 'Is subscription expiring soon (within 7 days)', example: false })
    get isExpiringSoon(): boolean {
        return this.isActive && this.daysRemaining <= 7;
    }

    @ApiProperty({ description: 'Is subscription expired', example: false })
    get isExpired(): boolean {
        return this.status === SUBSCRIPTION_STATUS.EXPIRED || new Date() >= this.expiresAt;
    }

    @ApiProperty({ description: 'Is subscription cancelled', example: false })
    get isCancelled(): boolean {
        return this.status === SUBSCRIPTION_STATUS.CANCELLED;
    }
}

export interface UserSubscriptionCreationAttrs {
    userId: string;
    planId: string;
    durationId: string;
    startedAt: Date;
    expiresAt: Date;
    status?: SubscriptionStatus;
    paidAmount: number;
    paymentMethod?: string;
    transactionId?: string;
    autoRenew?: boolean;
}
