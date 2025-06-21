import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';

import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
    @ApiPropertyOptional({
        description: 'User active status',
        example: true,
    })
    @IsOptional()
    @IsBoolean({ message: 'isActive must be a boolean' })
    isActive?: boolean;

    @ApiPropertyOptional({
        description: 'User role',
        example: 'user',
        enum: ['admin', 'user'],
    })
    @IsOptional()
    @IsEnum(['admin', 'user'], { message: 'Role must be either admin or user' })
    role?: 'admin' | 'user';

    @ApiPropertyOptional({
        description: 'Email verified status',
        example: false,
    })
    @IsOptional()
    @IsBoolean({ message: 'emailVerified must be a boolean' })
    emailVerified?: boolean;
}
