import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { Request, Response } from 'express';

import { COOKIE_CONFIG } from '@/common/constants';
import { AuthenticatedUser } from '@/common/interfaces';
import { GetUser } from '@/modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { JwtRefreshGuard } from '@/modules/auth/guards/refresh-token.guard';

import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';

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
        res.cookie(COOKIE_CONFIG.REFRESH_TOKEN.NAME, result.refreshToken, COOKIE_CONFIG.REFRESH_TOKEN.OPTIONS);

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
        res.cookie(COOKIE_CONFIG.REFRESH_TOKEN.NAME, result.refreshToken, COOKIE_CONFIG.REFRESH_TOKEN.OPTIONS);

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
    @ApiOperation({ summary: 'Logout user using refresh token cookie and clear refresh token cookie' })
    @ApiResponse({ status: 200, description: 'User logged out successfully' })
    async logout(
        @Req() req: RefreshTokenRequest,
        @Res({ passthrough: true }) res: Response,
    ): Promise<{ message: string }> {
        // RefreshTokenGuard already validated and attached the token
        await this.authService.logoutWithSessionData(req.user.sessionData);

        // Clear refresh token cookie
        res.clearCookie(COOKIE_CONFIG.REFRESH_TOKEN.NAME, {
            path: COOKIE_CONFIG.REFRESH_TOKEN.OPTIONS.path,
            secure: COOKIE_CONFIG.REFRESH_TOKEN.OPTIONS.secure,
            sameSite: COOKIE_CONFIG.REFRESH_TOKEN.OPTIONS.sameSite,
        });

        return { message: 'Logged out successfully' };
    }

    @Post('logout-token')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Logout user using access token from Authorization header' })
    @ApiResponse({ status: 200, description: 'User logged out successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async logoutWithToken(
        @GetUser() user: AuthenticatedUser,
        @Res({ passthrough: true }) res: Response,
    ): Promise<{ message: string }> {
        // 🔥 DIRECT: Use validated user data from JwtAuthGuard
        await this.authService.logout(user.id, user.sid);

        // Also clear refresh token cookie if present
        res.clearCookie(COOKIE_CONFIG.REFRESH_TOKEN.NAME, {
            path: COOKIE_CONFIG.REFRESH_TOKEN.OPTIONS.path,
            secure: COOKIE_CONFIG.REFRESH_TOKEN.OPTIONS.secure,
            sameSite: COOKIE_CONFIG.REFRESH_TOKEN.OPTIONS.sameSite,
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
        @GetUser() user: AuthenticatedUser,
        @Res({ passthrough: true }) res: Response,
    ): Promise<{ message: string }> {
        await this.authService.logoutAll(user.id);

        // Also clear current device's refresh token cookie
        res.clearCookie(COOKIE_CONFIG.REFRESH_TOKEN.NAME, {
            path: COOKIE_CONFIG.REFRESH_TOKEN.OPTIONS.path,
            secure: COOKIE_CONFIG.REFRESH_TOKEN.OPTIONS.secure,
            sameSite: COOKIE_CONFIG.REFRESH_TOKEN.OPTIONS.sameSite,
        });

        return { message: 'Logged out from all devices' };
    }

    @Get('profile')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user profile' })
    @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    getProfile(@GetUser() user: AuthenticatedUser) {
        return {
            id: user.id,
            email: user.email,
            role: user.role,
            sessionId: user.sid,
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
