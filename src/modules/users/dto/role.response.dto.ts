import { ApiProperty } from '@nestjs/swagger';

import { Exclude, Expose, plainToInstance } from 'class-transformer';
import { assign } from 'lodash';

import { Role } from '@/modules/users/entities/role.entity';

@Exclude()
export class RoleResponseDto {
    @Expose()
    @ApiProperty({ description: 'Role ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    id: string;

    @Expose()
    @ApiProperty({ description: 'Role name', example: 'admin' })
    name: string;

    @Expose()
    @ApiProperty({ description: 'Role description', example: 'Administrator role with full access' })
    description?: string;

    constructor(role: Role) {
        assign(this, plainToInstance(RoleResponseDto, role, { excludeExtraneousValues: true }));
    }
}
