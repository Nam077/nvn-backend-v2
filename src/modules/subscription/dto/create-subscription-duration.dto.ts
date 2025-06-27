import { ApiProperty } from '@nestjs/swagger';

import { IsBoolean, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CreateSubscriptionDurationDto {
    @ApiProperty({
        description: 'Plan ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsUUID()
    planId: string;

    @ApiProperty({
        description: 'Duration in days',
        example: 30,
        minimum: 1,
        maximum: 730,
    })
    @IsNumber()
    @Min(1)
    @Max(730)
    durationDays: number;

    @ApiProperty({
        description: 'Price in VND',
        example: 99000,
    })
    @IsNumber()
    @Min(0)
    price: number;

    @ApiProperty({
        description: 'Discount percentage (0-1)',
        example: 0.15,
        required: false,
        default: 0,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1)
    discountPercentage?: number;

    @ApiProperty({
        description: 'Is duration active',
        example: true,
        required: false,
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiProperty({
        description: 'Sort order',
        example: 1,
        required: false,
        default: 0,
    })
    @IsOptional()
    @IsNumber()
    sortOrder?: number;
}
