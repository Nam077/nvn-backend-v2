import { ApiProperty } from '@nestjs/swagger';

import { Column, CreatedAt, DataType, HasMany, Model, PrimaryKey, Table, UpdatedAt } from 'sequelize-typescript';

import { SubscriptionDuration } from '@/modules/subscription/entities/subscription-duration.entity';
import { UserSubscription } from '@/modules/subscription/entities/user-subscription.entity';

@Table({
    tableName: 'subscription_plans',
    underscored: true,
})
export class SubscriptionPlan extends Model<SubscriptionPlan, SubscriptionPlanCreationAttrs> {
    @ApiProperty({ description: 'Plan ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
    })
    declare id: string;

    @ApiProperty({ description: 'Plan name', example: 'VIP' })
    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare name: string;

    @ApiProperty({ description: 'Plan slug', example: 'vip' })
    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
    })
    declare slug: string;

    @ApiProperty({ description: 'Plan description', example: 'VIP plan with premium features' })
    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    declare description: string;

    @ApiProperty({ description: 'Base price in VND', example: 99000 })
    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
    })
    declare basePrice: number;

    @ApiProperty({ description: 'Is plan active', example: true })
    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    declare isActive: boolean;

    @ApiProperty({ description: 'Sort order', example: 1 })
    @Column({
        type: DataType.INTEGER,
        defaultValue: 0,
    })
    declare sortOrder: number;

    @ApiProperty({ description: 'Creation date' })
    @CreatedAt
    declare createdAt: Date;

    @ApiProperty({ description: 'Last update date' })
    @UpdatedAt
    declare updatedAt: Date;

    // Associations
    @HasMany(() => SubscriptionDuration)
    declare durations: SubscriptionDuration[];

    @HasMany(() => UserSubscription)
    declare subscriptions: UserSubscription[];
}

export interface SubscriptionPlanCreationAttrs {
    name: string;
    slug: string;
    description?: string;
    basePrice: number;
    isActive?: boolean;
    sortOrder?: number;
}
