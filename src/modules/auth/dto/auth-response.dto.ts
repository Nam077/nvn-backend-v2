import { ApiProperty } from '@nestjs/swagger';

import { User } from '@/modules/users/entities/user.entity';

export class AuthResponseDto {
    @ApiProperty({
        description: 'JWT access token',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    })
    accessToken: string;

    @ApiProperty({
        description: 'Token type',
        example: 'Bearer',
    })
    tokenType: string;

    @ApiProperty({
        description: 'Token expiration time in seconds',
        example: 604800,
    })
    expiresIn: number;

    @ApiProperty({
        description: 'User information',
        type: User,
    })
    user: Omit<User, 'password'>;
}
