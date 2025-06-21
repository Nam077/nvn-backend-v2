import { ApiProperty } from '@nestjs/swagger';

import { Column, CreatedAt, DataType, Model, PrimaryKey, Table, UpdatedAt } from 'sequelize-typescript';

@Table({
    tableName: 'users',
    underscored: true,
})
export class User extends Model<User, UserCreationAttrs> {
    @ApiProperty({ description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
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
    })
    email: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    password: string;

    @ApiProperty({ description: 'First name', example: 'John' })
    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    firstName: string;

    @ApiProperty({ description: 'Last name', example: 'Doe' })
    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    lastName: string;

    @ApiProperty({ description: 'Is user active', example: true })
    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    isActive: boolean;

    @ApiProperty({ description: 'User role', example: 'user' })
    @Column({
        type: DataType.ENUM('admin', 'user'),
        defaultValue: 'user',
    })
    role: 'admin' | 'user';

    @ApiProperty({ description: 'Email verified status', example: false })
    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    emailVerified: boolean;

    @ApiProperty({ description: 'Last login date' })
    @Column({
        type: DataType.DATE,
        allowNull: true,
    })
    lastLoginAt: Date;

    @ApiProperty({ description: 'Creation date' })
    @CreatedAt
    declare createdAt: Date;

    @ApiProperty({ description: 'Last update date' })
    @UpdatedAt
    declare updatedAt: Date;

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
