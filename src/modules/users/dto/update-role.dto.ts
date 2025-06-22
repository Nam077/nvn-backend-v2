import { ApiProperty } from '@nestjs/swagger';

import { IsString, IsOptional, IsBoolean, IsNumber, MinLength, MaxLength } from 'class-validator';

export class UpdateRoleDto {
    @ApiProperty({
        description: 'Role display name',
        example: 'Content Manager',
        minLength: 2,
        maxLength: 100,
        required: false,
    })
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    displayName?: string;

    @ApiProperty({
        description: 'Role description',
        example: 'Can manage content and moderate posts',
        required: false,
        maxLength: 500,
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @ApiProperty({
        description: 'Role priority (higher = more important)',
        example: 50,
        required: false,
    })
    @IsOptional()
    @IsNumber()
    priority?: number;

    @ApiProperty({
        description: 'Is role active',
        example: true,
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
