import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
    @ApiProperty({ description: 'User ID' })
    id: string;

    @ApiProperty({ description: 'User email' })
    email: string;

    @ApiProperty({ description: 'User first name' })
    firstName: string;

    @ApiProperty({ description: 'User last name' })
    lastName: string;

    @ApiProperty({ description: 'User role', enum: ['admin', 'user'] })
    role: string;

    @ApiProperty({ description: 'User active status' })
    isActive: boolean;

    @ApiProperty({ description: 'Email verification status' })
    emailVerified: boolean;
}

export class AuthResponseDto {
    @ApiProperty({ description: 'Access token' })
    accessToken: string;

    @ApiProperty({ description: 'Refresh token' })
    refreshToken: string;

    @ApiProperty({ description: 'User information' })
    user: UserDto;

    @ApiProperty({ description: 'Access token expiration time in seconds' })
    expiresIn: number;

    @ApiProperty({ description: 'Refresh token expiration time in seconds' })
    refreshExpiresIn: number;
}
