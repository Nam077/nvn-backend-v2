import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { Request, Response } from 'express';

import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { JwtRefreshGuard } from '@/modules/auth/guards/refresh-token.guard';

import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';

interface AuthenticatedRequest extends Request {
    user: {
        id: string;
        email: string;
        role?: string;
        jti: string;
        sid: string;
    };
}

interface RefreshTokenRequest extends Request {
    user: {
        id: string;
        email: string;
        role?: string;
        jti: string;
        sid: string;
        refreshToken: string;
        sessionData: {
            sid: string;
            id: string;
            email: string;
            firstName?: string;
            lastName?: string;
            isActive: boolean;
            emailVerified: boolean;
            permissions: string[];
            roles: Array<{ id: string; name: string; displayName?: string }>;
            accessTokenJti: string;
            refreshTokenJti: string;
            accessTokenExpiry: Date;
            refreshTokenExpiry: Date;
            createdAt: Date;
            lastUsedAt: Date;
        };
    };
}

// Cookie configuration for refresh tokens
const REFRESH_TOKEN_COOKIE_CONFIG = {
    name: 'nvn_refresh_token',
    options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'User login with cookie-based refresh token' })
    @ApiResponse({ status: 200, description: 'Login successful', type: AuthResponseDto })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(
        @Body() loginDto: LoginDto,
        @Res({ passthrough: true }) res: Response,
    ): Promise<Omit<AuthResponseDto, 'refreshToken'>> {
        const result = await this.authService.login(loginDto);

        // Set refresh token as httpOnly cookie
        res.cookie(REFRESH_TOKEN_COOKIE_CONFIG.name, result.refreshToken, REFRESH_TOKEN_COOKIE_CONFIG.options);

        // Return only access token and user info (no refresh token in response)
        return {
            accessToken: result.accessToken,
            user: result.user,
            expiresIn: result.expiresIn,
            refreshExpiresIn: result.refreshExpiresIn,
        };
    }

    @Post('refresh')
    @UseGuards(JwtRefreshGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh access token using httpOnly cookie' })
    @ApiResponse({ status: 200, description: 'Token refreshed successfully', type: AuthResponseDto })
    async refreshToken(
        @Req() req: RefreshTokenRequest,
        @Res({ passthrough: true }) res: Response,
    ): Promise<Omit<AuthResponseDto, 'refreshToken'>> {
        // RefreshTokenGuard already validated the token and attached session data to request
        const result = await this.authService.refreshTokenWithSessionData(req.user);

        // Set new refresh token as httpOnly cookie
        res.cookie(REFRESH_TOKEN_COOKIE_CONFIG.name, result.refreshToken, REFRESH_TOKEN_COOKIE_CONFIG.options);

        // Return only access token and user info
        return {
            accessToken: result.accessToken,
            user: result.user,
            expiresIn: result.expiresIn,
            refreshExpiresIn: result.refreshExpiresIn,
        };
    }

    @Post('logout')
    @UseGuards(JwtRefreshGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Logout user and clear refresh token cookie' })
    @ApiResponse({ status: 200, description: 'User logged out successfully' })
    async logout(
        @Req() req: RefreshTokenRequest,
        @Res({ passthrough: true }) res: Response,
    ): Promise<{ message: string }> {
        // RefreshTokenGuard already validated and attached the token
        await this.authService.logoutWithSessionData(req.user.sessionData);

        // Clear refresh token cookie
        res.clearCookie(REFRESH_TOKEN_COOKIE_CONFIG.name, {
            path: REFRESH_TOKEN_COOKIE_CONFIG.options.path,
            secure: REFRESH_TOKEN_COOKIE_CONFIG.options.secure,
            sameSite: REFRESH_TOKEN_COOKIE_CONFIG.options.sameSite,
        });

        return { message: 'Logged out successfully' };
    }

    @Post('logout-all')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Logout from all devices' })
    @ApiResponse({ status: 200, description: 'Logout from all devices successful' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async logoutAll(
        @Req() req: AuthenticatedRequest,
        @Res({ passthrough: true }) res: Response,
    ): Promise<{ message: string }> {
        await this.authService.logoutAll(req.user.id);

        // Also clear current device's refresh token cookie
        res.clearCookie(REFRESH_TOKEN_COOKIE_CONFIG.name, {
            path: REFRESH_TOKEN_COOKIE_CONFIG.options.path,
            secure: REFRESH_TOKEN_COOKIE_CONFIG.options.secure,
            sameSite: REFRESH_TOKEN_COOKIE_CONFIG.options.sameSite,
        });

        return { message: 'Logged out from all devices' };
    }

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user profile' })
    @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    getProfile(@Req() req: AuthenticatedRequest) {
        return {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role,
            sessionId: req.user.sid,
        };
    }

    @Get('check-auth')
    @UseGuards(JwtRefreshGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Check if user is authenticated via refresh token cookie' })
    @ApiResponse({ status: 200, description: 'Authentication status checked' })
    checkAuth(@Req() req: RefreshTokenRequest): {
        isAuthenticated: boolean;
        hasRefreshToken: boolean;
        user: {
            id: string;
            email: string;
            role?: string;
        };
    } {
        // RefreshTokenGuard already validated the token
        return {
            isAuthenticated: true,
            hasRefreshToken: true,
            user: {
                id: req.user.id,
                email: req.user.email,
                role: req.user.role,
            },
        };
    }
}
