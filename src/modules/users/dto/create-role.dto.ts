import { ApiProperty } from '@nestjs/swagger';

import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsBoolean, IsNumber, MinLength, MaxLength, IsArray, IsUUID } from 'class-validator';
import { toLower, trim } from 'lodash';

export class CreateRoleDto {
    @ApiProperty({
        description: 'Role name (unique identifier)',
        example: 'content_manager',
        minLength: 2,
        maxLength: 50,
    })
    @IsString()
    @MinLength(2)
    @MaxLength(50)
    @Transform(({ value }) => trim(toLower(value)))
    name: string;

    @ApiProperty({
        description: 'Role display name',
        example: 'Content Manager',
        minLength: 2,
        maxLength: 100,
    })
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    displayName: string;

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
        default: 0,
    })
    @IsOptional()
    @IsNumber()
    priority?: number;

    @ApiProperty({
        description: 'Is system role (cannot be deleted)',
        example: false,
        required: false,
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    isSystem?: boolean;

    @ApiProperty({
        description: 'Permission IDs to assign to this role',
        example: ['123e4567-e89b-12d3-a456-426614174000'],
        required: false,
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    permissionIds?: string[];
}
