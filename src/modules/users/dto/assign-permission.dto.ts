import { ApiProperty } from '@nestjs/swagger';

import { IsUUID, IsArray } from 'class-validator';

export class AssignPermissionDto {
    @ApiProperty({
        description: 'Role ID to assign permissions to',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    @IsUUID('4')
    roleId: string;

    @ApiProperty({
        description: 'Permission IDs to assign',
        example: ['456e7890-e89b-12d3-a456-426614174000'],
        type: [String],
    })
    @IsArray()
    @IsUUID('4', { each: true })
    permissionIds: string[];
}

export class AssignSinglePermissionDto {
    @ApiProperty({
        description: 'Permission ID to assign',
        example: '456e7890-e89b-12d3-a456-426614174000',
    })
    @IsUUID('4')
    permissionId: string;
}
