import { ApiProperty } from '@nestjs/swagger';

import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateSubscriptionPlanDto {
    @ApiProperty({
        description: 'Plan name',
        example: 'VIP',
    })
    @IsString()
    name: string;

    @ApiProperty({
        description: 'Plan slug',
        example: 'vip',
    })
    @IsString()
    slug: string;

    @ApiProperty({
        description: 'Plan description',
        example: 'VIP plan with premium features',
        required: false,
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        description: 'Base price in VND',
        example: 99000,
    })
    @IsNumber()
    @Min(0)
    basePrice: number;

    @ApiProperty({
        description: 'Is plan active',
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
