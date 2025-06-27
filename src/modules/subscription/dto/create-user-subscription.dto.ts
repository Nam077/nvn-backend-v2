import { ApiProperty } from '@nestjs/swagger';

import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { values } from 'lodash';

import { SUBSCRIPTION_STATUS, SubscriptionStatus } from '@/modules/subscription/constants/subscription.constants';

export class CreateUserSubscriptionDto {
    @ApiProperty({
        description: 'Duration ID to subscribe',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsUUID()
    durationId: string;

    @ApiProperty({
        description: 'Payment method',
        example: 'credit_card',
        required: false,
    })
    @IsOptional()
    @IsString()
    paymentMethod?: string;

    @ApiProperty({
        description: 'Transaction ID from payment gateway',
        example: 'txn_123456789',
        required: false,
    })
    @IsOptional()
    @IsString()
    transactionId?: string;

    @ApiProperty({
        description: 'Auto renewal enabled',
        example: true,
        required: false,
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    autoRenew?: boolean;
}

export class CreateUserSubscriptionInternalDto {
    @ApiProperty({
        description: 'User ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsUUID()
    userId: string;

    @ApiProperty({
        description: 'Plan ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsUUID()
    planId: string;

    @ApiProperty({
        description: 'Duration ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsUUID()
    durationId: string;

    @ApiProperty({
        description: 'Subscription start date',
        example: '2024-01-01T00:00:00.000Z',
    })
    @IsDateString()
    startedAt: Date;

    @ApiProperty({
        description: 'Subscription expiry date',
        example: '2024-02-01T00:00:00.000Z',
    })
    @IsDateString()
    expiresAt: Date;

    @ApiProperty({
        description: 'Subscription status',
        example: 'active',
        enum: values(SUBSCRIPTION_STATUS),
        required: false,
        default: SUBSCRIPTION_STATUS.ACTIVE,
    })
    @IsOptional()
    @IsString()
    status?: SubscriptionStatus;

    @ApiProperty({
        description: 'Amount paid in VND',
        example: 99000,
    })
    @IsNumber()
    @Min(0)
    paidAmount: number;

    @ApiProperty({
        description: 'Payment method',
        example: 'credit_card',
        required: false,
    })
    @IsOptional()
    @IsString()
    paymentMethod?: string;

    @ApiProperty({
        description: 'Transaction ID',
        example: 'txn_123456789',
        required: false,
    })
    @IsOptional()
    @IsString()
    transactionId?: string;

    @ApiProperty({
        description: 'Auto renewal enabled',
        example: true,
        required: false,
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    autoRenew?: boolean;
}
