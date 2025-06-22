import { ApiProperty } from '@nestjs/swagger';

import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';
import { toLower, trim } from 'lodash';

export class CreatePermissionDto {
    @ApiProperty({
        description: 'Permission name (format: resource:action)',
        example: 'users:read',
        minLength: 3,
        maxLength: 100,
    })
    @IsString()
    @MinLength(3)
    @MaxLength(100)
    @Transform(({ value }) => trim(toLower(value as string)))
    name: string;

    @ApiProperty({
        description: 'Permission description',
        example: 'Can read user information',
        required: false,
        maxLength: 200,
    })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    description?: string;

    @ApiProperty({
        description: 'Resource name',
        example: 'users',
        minLength: 2,
        maxLength: 50,
    })
    @IsString()
    @MinLength(2)
    @MaxLength(50)
    @Transform(({ value }) => toLower(trim(value as string)))
    resource: string;

    @ApiProperty({
        description: 'Action name',
        example: 'read',
        minLength: 2,
        maxLength: 50,
    })
    @IsString()
    @MinLength(2)
    @MaxLength(50)
    @Transform(({ value }) => toLower(trim(value as string)))
    action: string;

    @ApiProperty({
        description: 'Is permission active',
        example: true,
        required: false,
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
