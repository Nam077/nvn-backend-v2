import { ApiProperty } from '@nestjs/swagger';

import { Exclude, Expose, plainToInstance } from 'class-transformer';
import { assign } from 'lodash';

import { Permission } from '@/modules/users/entities/permission.entity';

@Exclude()
export class PermissionResponseDto {
    @Expose()
    @ApiProperty({ description: 'Permission ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    id: string;

    @Expose()
    @ApiProperty({ description: 'Permission name', example: 'users:read' })
    name: string;

    @Expose()
    @ApiProperty({ description: 'Permission description', example: 'Can read user information' })
    description?: string;

    constructor(permission: Permission) {
        assign(this, plainToInstance(PermissionResponseDto, permission, { excludeExtraneousValues: true }));
    }
}
