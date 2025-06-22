import { ApiProperty } from '@nestjs/swagger';

import { BelongsToMany, Column, CreatedAt, DataType, Model, PrimaryKey, Table, UpdatedAt } from 'sequelize-typescript';

import { Permission } from './permission.entity';
import { RolePermission } from './role-permission.entity';
import { UserRole } from './user-role.entity';
import { User } from './user.entity';

@Table({
    tableName: 'roles',
    underscored: true,
})
export class Role extends Model<Role, RoleCreationAttrs> {
    @ApiProperty({ description: 'Role ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
    })
    declare id: string;

    @ApiProperty({ description: 'Role name', example: 'admin' })
    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
    })
    declare name: string;

    @ApiProperty({ description: 'Role display name', example: 'Administrator' })
    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare displayName: string;

    @ApiProperty({ description: 'Role description', example: 'Full access to all resources' })
    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    declare description: string;

    @ApiProperty({ description: 'Is role active', example: true })
    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    declare isActive: boolean;

    @ApiProperty({ description: 'Role priority (higher = more important)', example: 100 })
    @Column({
        type: DataType.INTEGER,
        defaultValue: 0,
    })
    declare priority: number;

    @ApiProperty({ description: 'Is system role (cannot be deleted)', example: false })
    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    declare isSystem: boolean;

    @ApiProperty({ description: 'Creation date' })
    @CreatedAt
    declare createdAt: Date;

    @ApiProperty({ description: 'Last update date' })
    @UpdatedAt
    declare updatedAt: Date;

    // Associations
    @BelongsToMany(() => User, () => UserRole)
    declare users: User[];

    @BelongsToMany(() => Permission, () => RolePermission)
    declare permissions: Permission[];
}

export interface RoleCreationAttrs {
    name: string;
    displayName: string;
    description?: string;
    priority?: number;
    isSystem?: boolean;
}
