import { ApiProperty } from '@nestjs/swagger';

import { IsUUID, IsOptional, IsDateString, IsArray } from 'class-validator';

export class AssignRoleDto {
    @ApiProperty({
        description: 'User ID to assign roles to',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsUUID('4')
    userId: string;

    @ApiProperty({
        description: 'Role IDs to assign',
        example: ['456e7890-e89b-12d3-a456-426614174000'],
        type: [String],
    })
    @IsArray()
    @IsUUID('4', { each: true })
    roleIds: string[];

    @ApiProperty({
        description: 'Role expiry date (ISO string, null = no expiry)',
        example: '2024-12-31T23:59:59.999Z',
        required: false,
    })
    @IsOptional()
    @IsDateString()
    expiresAt?: string;
}

export class AssignSingleRoleDto {
    @ApiProperty({
        description: 'Role ID to assign',
        example: '456e7890-e89b-12d3-a456-426614174000',
    })
    @IsUUID('4')
    roleId: string;

    @ApiProperty({
        description: 'Role expiry date (ISO string, null = no expiry)',
        example: '2024-12-31T23:59:59.999Z',
        required: false,
    })
    @IsOptional()
    @IsDateString()
    expiresAt?: string;
}
