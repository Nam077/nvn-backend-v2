import { Body, Controller, Get, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { AuthService } from '@/modules/auth/auth.service';
import { AuthResponseDto } from '@/modules/auth/dto/auth-response.dto';
import { LoginDto } from '@/modules/auth/dto/login.dto';
import { CreateUserDto } from '@/modules/users/dto/create-user.dto';
import { User } from '@/modules/users/entities/user.entity';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiOkResponse({
        description: 'User profile retrieved successfully',
        type: User,
    })
    getProfile(@CurrentUser() user: User): User {
        return user;
    }
    @Post('login')
    @ApiOperation({ summary: 'User login' })
    @ApiOkResponse({
        description: 'Login successful',
        type: AuthResponseDto,
    })
    async login(@Body(ValidationPipe) loginDto: LoginDto): Promise<AuthResponseDto> {
        return this.authService.login(loginDto);
    }

    @Post('refresh')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Refresh access token' })
    @ApiOkResponse({
        description: 'Token refreshed successfully',
        schema: {
            type: 'object',
            properties: {
                accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            },
        },
    })
    refreshToken(@CurrentUser() user: User): { accessToken: string } {
        return this.authService.refreshToken(user);
    }
    @Post('register')
    @ApiOperation({ summary: 'User registration' })
    @ApiCreatedResponse({
        description: 'Registration successful',
        type: AuthResponseDto,
    })
    async register(@Body(ValidationPipe) createUserDto: CreateUserDto): Promise<AuthResponseDto> {
        return this.authService.register(createUserDto);
    }
}
