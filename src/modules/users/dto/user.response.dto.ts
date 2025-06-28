import { ApiProperty } from '@nestjs/swagger';

import { Exclude, Expose, plainToInstance } from 'class-transformer';
import { assign } from 'lodash';

import { User } from '../entities/user.entity';

@Exclude()
export class UserResponseDto {
    @Expose()
    @ApiProperty({ description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    id: string;

    @Expose()
    @ApiProperty({ description: 'User email', example: 'user@example.com' })
    email: string;

    @Expose()
    @ApiProperty({ description: 'First name', example: 'John' })
    firstName: string;

    @Expose()
    @ApiProperty({ description: 'Last name', example: 'Doe' })
    lastName: string;

    @Expose()
    @ApiProperty({ description: 'Is user active', example: true })
    isActive: boolean;

    @Expose()
    @ApiProperty({ description: 'Email verified status', example: false })
    emailVerified: boolean;

    @Expose()
    @ApiProperty({ description: 'Last login date' })
    lastLoginAt: Date;

    @Expose()
    @ApiProperty({ description: 'Creation date' })
    createdAt: Date;

    @Expose()
    @ApiProperty({ description: 'Last update date' })
    updatedAt: Date;

    constructor(user: User) {
        assign(this, plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true }));
    }
}
