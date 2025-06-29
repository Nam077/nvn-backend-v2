import { ApiProperty } from '@nestjs/swagger';

import { Column, CreatedAt, DataType, ForeignKey, Model, PrimaryKey, Table, UpdatedAt } from 'sequelize-typescript';

import { Permission } from '@/modules/users/entities/permission.entity';
import { Role } from '@/modules/users/entities/role.entity';

@Table({
    tableName: 'role_permissions',
})
export class RolePermission extends Model<RolePermission, RolePermissionCreationAttrs> {
    @ApiProperty({ description: 'Role Permission ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        field: 'id',
    })
    declare id: string;

    @ApiProperty({ description: 'Role ID' })
    @ForeignKey(() => Role)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'roleId',
    })
    declare roleId: string;

    @ApiProperty({ description: 'Permission ID' })
    @ForeignKey(() => Permission)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'permissionId',
    })
    declare permissionId: string;

    @ApiProperty({ description: 'Permission granted date' })
    @Column({
        type: DataType.DATE,
        allowNull: true,
        defaultValue: DataType.NOW,
        field: 'grantedAt',
    })
    declare grantedAt: Date;

    @ApiProperty({ description: 'Who granted this permission' })
    @Column({
        type: DataType.UUID,
        allowNull: true,
        field: 'grantedBy',
    })
    declare grantedBy: string;

    @ApiProperty({ description: 'Is permission active', example: true })
    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
        field: 'isActive',
    })
    declare isActive: boolean;

    @ApiProperty({ description: 'Creation date' })
    @CreatedAt
    @Column({ field: 'createdAt' })
    declare createdAt: Date;

    @ApiProperty({ description: 'Last update date' })
    @UpdatedAt
    @Column({ field: 'updatedAt' })
    declare updatedAt: Date;
}

export interface RolePermissionCreationAttrs {
    roleId: string;
    permissionId: string;
    grantedBy?: string;
}
