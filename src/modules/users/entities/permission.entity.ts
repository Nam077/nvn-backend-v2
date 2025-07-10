import { ApiProperty } from '@nestjs/swagger';

import { BelongsToMany, Column, CreatedAt, DataType, Model, PrimaryKey, Table, UpdatedAt } from 'sequelize-typescript';

import { RolePermission } from '@/modules/users/entities/role-permission.entity';
import { Role } from '@/modules/users/entities/role.entity';

@Table({
    tableName: 'nvn_permissions',
})
export class Permission extends Model<Permission, PermissionCreationAttrs> {
    @ApiProperty({ description: 'Permission ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        field: 'id',
    })
    declare id: string;

    @ApiProperty({ description: 'Permission name', example: 'users:read' })
    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
        field: 'name',
    })
    declare name: string;

    @ApiProperty({ description: 'Permission description', example: 'Can read users' })
    @Column({
        type: DataType.STRING,
        allowNull: true,
        field: 'description',
    })
    declare description: string;

    @ApiProperty({ description: 'Permission resource', example: 'users' })
    @Column({
        type: DataType.STRING,
        allowNull: false,
        field: 'resource',
    })
    declare resource: string;

    @ApiProperty({ description: 'Permission action', example: 'read' })
    @Column({
        type: DataType.STRING,
        allowNull: false,
        field: 'action',
    })
    declare action: string;

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

    // Associations
    @BelongsToMany(() => Role, () => RolePermission)
    declare roles: Role[];
}

export interface PermissionCreationAttrs {
    name: string;
    description?: string;
    resource: string;
    action: string;
}
