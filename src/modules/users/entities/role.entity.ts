import { ApiProperty } from '@nestjs/swagger';

import {
    BelongsToMany,
    Column,
    CreatedAt,
    DataType,
    DeletedAt,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt,
} from 'sequelize-typescript';

import { Permission } from './permission.entity';
import { RolePermission } from './role-permission.entity';
import { UserRole } from './user-role.entity';
import { User } from './user.entity';

@Table({
    tableName: 'nvn_roles',
    timestamps: true,
    paranoid: true,
})
export class Role extends Model<Role, RoleCreationAttrs> {
    @ApiProperty({ description: 'Role ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        field: 'id',
    })
    declare id: string;

    @ApiProperty({ description: 'Role name', example: 'admin' })
    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
        field: 'name',
    })
    declare name: string;

    @ApiProperty({ description: 'Role display name', example: 'Administrator' })
    @Column({
        type: DataType.STRING,
        allowNull: false,
        field: 'displayName',
    })
    declare displayName: string;

    @ApiProperty({ description: 'Role description', example: 'Full access to all resources' })
    @Column({
        type: DataType.TEXT,
        allowNull: true,
        field: 'description',
    })
    declare description: string;

    @ApiProperty({ description: 'Is role active', example: true })
    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
        field: 'isActive',
    })
    declare isActive: boolean;

    @ApiProperty({ description: 'Role priority (higher = more important)', example: 100 })
    @Column({
        type: DataType.INTEGER,
        defaultValue: 0,
        field: 'priority',
    })
    declare priority: number;

    @ApiProperty({ description: 'Is system role (cannot be deleted)', example: false })
    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
        field: 'isSystem',
    })
    declare isSystem: boolean;

    @ApiProperty({ description: 'Creation date' })
    @CreatedAt
    @Column({ field: 'createdAt' })
    declare createdAt: Date;

    @ApiProperty({ description: 'Last update date' })
    @UpdatedAt
    @Column({ field: 'updatedAt' })
    declare updatedAt: Date;

    @DeletedAt
    @Column({ field: 'deletedAt' })
    declare deletedAt: Date;

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
