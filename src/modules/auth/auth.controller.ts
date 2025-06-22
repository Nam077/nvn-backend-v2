import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { Request } from 'express';

import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { DynamicJwtAuthGuard } from './guards/dynamic-jwt-auth.guard';

interface AuthenticatedRequest extends Request {
    user: {
        id: string;
        email: string;
        role: string;
    };
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'User login' })
    @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponseDto })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
        return this.authService.login(loginDto);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh access token' })
    @ApiResponse({ status: 200, description: 'Token refreshed successfully', type: AuthResponseDto })
    @ApiResponse({ status: 401, description: 'Invalid refresh token' })
    async refreshToken(@Body() body: { refreshToken: string }): Promise<AuthResponseDto> {
        return this.authService.refreshToken(body.refreshToken);
    }

    @Post('logout')
    @UseGuards(DynamicJwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Logout user' })
    @ApiResponse({ status: 200, description: 'User logged out successfully' })
    async logout(@Req() req: AuthenticatedRequest): Promise<{ message: string }> {
        // eslint-disable-next-line lodash/prefer-lodash-method
        const refreshToken = req.headers.authorization?.replace(/^Bearer /, '') || '';
        await this.authService.logout(refreshToken);
        return { message: 'Logged out successfully' };
    }

    @Post('logout-all')
    @UseGuards(DynamicJwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Logout from all devices' })
    @ApiResponse({ status: 200, description: 'Logout from all devices successful' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async logoutAll(@Req() req: AuthenticatedRequest): Promise<{ message: string }> {
        await this.authService.logoutAll(req.user.id);
        return { message: 'Logged out from all devices' };
    }

    @Get('profile')
    @UseGuards(DynamicJwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user profile' })
    @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    getProfile(@Req() req: AuthenticatedRequest) {
        return {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role,
        };
    }
}
