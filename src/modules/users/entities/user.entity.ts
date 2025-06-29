import { ApiProperty } from '@nestjs/swagger';

import {
    BelongsToMany,
    Column,
    CreatedAt,
    DataType,
    HasMany,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt,
} from 'sequelize-typescript';

import { QueryConfig } from '@/modules/query-configs/entities/query-config.entity';

import { Role } from './role.entity';
import { UserRole } from './user-role.entity';

@Table({
    tableName: 'users',
})
export class User extends Model<User, UserCreationAttrs> {
    @ApiProperty({ description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        field: 'id',
    })
    declare id: string;

    @ApiProperty({ description: 'User email', example: 'user@example.com' })
    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
        field: 'email',
    })
    declare email: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        field: 'password',
    })
    declare password: string;

    @ApiProperty({ description: 'First name', example: 'John' })
    @Column({
        type: DataType.STRING,
        allowNull: true,
        field: 'firstName',
    })
    declare firstName: string;

    @ApiProperty({ description: 'Last name', example: 'Doe' })
    @Column({
        type: DataType.STRING,
        allowNull: true,
        field: 'lastName',
    })
    declare lastName: string;

    @ApiProperty({ description: 'Is user active', example: true })
    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
        field: 'isActive',
    })
    declare isActive: boolean;

    @ApiProperty({ description: 'Email verification status', example: true })
    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
        field: 'emailVerified',
    })
    declare emailVerified: boolean;

    @ApiProperty({ description: 'Creation date' })
    @CreatedAt
    @Column({ field: 'createdAt' })
    declare createdAt: Date;

    @ApiProperty({ description: 'Last update date' })
    @UpdatedAt
    @Column({ field: 'updatedAt' })
    declare updatedAt: Date;

    // Associations
    @BelongsToMany(() => Role, () => UserRole)
    declare roles: Role[];

    // --- Associations ---
    @HasMany(() => QueryConfig)
    declare queryConfigs: QueryConfig[];
    // Virtual properties
    @ApiProperty({ description: 'Full name', example: 'John Doe' })
    get fullName(): string {
        return `${this.firstName || ''} ${this.lastName || ''}`;
    }
}

export interface UserCreationAttrs {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
}
