import { ApiProperty } from '@nestjs/swagger';

import {
    BelongsTo,
    Column,
    CreatedAt,
    DataType,
    ForeignKey,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt,
} from 'sequelize-typescript';

import { Role } from './role.entity';
import { User } from './user.entity';

@Table({
    tableName: 'user_roles',
})
export class UserRole extends Model<UserRole, UserRoleCreationAttrs> {
    @ApiProperty({ description: 'User Role ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        field: 'id',
    })
    declare id: string;

    @ApiProperty({ description: 'User ID' })
    @ForeignKey(() => User)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'userId',
    })
    declare userId: string;

    @ApiProperty({ description: 'Role ID' })
    @ForeignKey(() => Role)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'roleId',
    })
    declare roleId: string;

    @ApiProperty({ description: 'Role assignment date' })
    @Column({
        type: DataType.DATE,
        allowNull: true,
        defaultValue: DataType.NOW,
        field: 'assignedAt',
    })
    declare assignedAt: Date;

    @ApiProperty({ description: 'Role expiry date (null = no expiry)' })
    @Column({
        type: DataType.DATE,
        allowNull: true,
        field: 'expiresAt',
    })
    declare expiresAt: Date;

    @ApiProperty({ description: 'Who assigned this role' })
    @Column({
        type: DataType.UUID,
        allowNull: true,
        field: 'assignedBy',
    })
    declare assignedBy: string;

    @ApiProperty({ description: 'Is role assignment active', example: true })
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
    @BelongsTo(() => User)
    declare User: User;

    @BelongsTo(() => Role)
    declare Role: Role;
}

export interface UserRoleCreationAttrs {
    userId: string;
    roleId: string;
    assignedBy?: string;
    expiresAt?: Date;
}
