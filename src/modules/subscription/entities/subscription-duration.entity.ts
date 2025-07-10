import { ApiProperty } from '@nestjs/swagger';

import {
    BelongsTo,
    Column,
    CreatedAt,
    DataType,
    ForeignKey,
    HasMany,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt,
} from 'sequelize-typescript';

import { SubscriptionPlan } from '@/modules/subscription/entities/subscription-plan.entity';
import { UserSubscription } from '@/modules/subscription/entities/user-subscription.entity';

@Table({
    tableName: 'nvn_subscription_durations',
})
export class SubscriptionDuration extends Model<SubscriptionDuration, SubscriptionDurationCreationAttrs> {
    @ApiProperty({ description: 'Duration ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        field: 'id',
    })
    declare id: string;

    @ApiProperty({ description: 'Plan ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ForeignKey(() => SubscriptionPlan)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'planId',
    })
    declare planId: string;

    @ApiProperty({ description: 'Duration in days', example: 30 })
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        field: 'durationDays',
    })
    declare durationDays: number;

    @ApiProperty({ description: 'Price in VND', example: 99000 })
    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
        field: 'price',
    })
    declare price: number;

    @ApiProperty({ description: 'Discount percentage', example: 0.15 })
    @Column({
        type: DataType.DECIMAL(5, 4),
        defaultValue: 0,
        field: 'discountPercentage',
    })
    declare discountPercentage: number;

    @ApiProperty({ description: 'Is duration active', example: true })
    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
        field: 'isActive',
    })
    declare isActive: boolean;

    @ApiProperty({ description: 'Sort order', example: 1 })
    @Column({
        type: DataType.INTEGER,
        defaultValue: 0,
        field: 'sortOrder',
    })
    declare sortOrder: number;

    @ApiProperty({ description: 'Creation date' })
    @CreatedAt
    @Column({ field: 'createdAt' })
    declare createdAt: Date;

    @ApiProperty({ description: 'Last update date' })
    @UpdatedAt
    @Column({ field: 'updatedAt' })
    declare updatedAt: Date;

    // Associations
    @BelongsTo(() => SubscriptionPlan)
    declare plan: SubscriptionPlan;

    @HasMany(() => UserSubscription)
    declare subscriptions: UserSubscription[];

    // Virtual properties
    @ApiProperty({ description: 'Final price after discount', example: 84150 })
    get finalPrice(): number {
        return this.price * (1 - this.discountPercentage);
    }

    @ApiProperty({ description: 'Savings amount', example: 14850 })
    get savingsAmount(): number {
        return this.price - this.finalPrice;
    }
}

export interface SubscriptionDurationCreationAttrs {
    planId: string;
    durationDays: number;
    price: number;
    discountPercentage?: number;
    isActive?: boolean;
    sortOrder?: number;
}
