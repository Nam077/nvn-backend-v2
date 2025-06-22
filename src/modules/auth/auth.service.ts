import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { randomUUID } from 'crypto';
import { has, isObject } from 'lodash';

import { RedisService } from '@/modules/redis/redis.service';
import { KeyManagerService } from '@/modules/security/services/key-manager.service';
import { UsersService } from '@/modules/users/users.service';

import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';

interface JwtPayload {
    sub: string;
    email: string;
    role?: string;
    type: string;
    jti: string;
    keyId: string;
    iat?: number;
    exp?: number;
    iss?: string;
    aud?: string;
}

interface UserInfo {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    emailVerified: boolean;
}

const JWT_ISSUER = 'nvn-backend';
const JWT_AUDIENCE = 'nvn-users';

/**
 * Type guard to check if decoded payload has required properties
 * @param payload - The payload to validate
 * @returns True if payload is a valid JwtPayload
 */
const isValidJwtPayload = (payload: unknown): payload is JwtPayload =>
    isObject(payload) &&
    has(payload, 'sub') &&
    has(payload, 'email') &&
    has(payload, 'type') &&
    has(payload, 'jti') &&
    has(payload, 'keyId');

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly keyManagerService: KeyManagerService,
        private readonly jwtService: JwtService,
        private readonly redisService: RedisService,
    ) {}

    async validateUser(email: string, password: string): Promise<UserInfo> {
        const user = await this.usersService.validatePassword(email, password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return user;
    }

    async login(loginDto: LoginDto): Promise<AuthResponseDto> {
        const user = await this.validateUser(loginDto.email, loginDto.password);

        // Generate access token and refresh token
        const [accessToken, refreshToken] = await Promise.all([
            this.generateAccessToken(user),
            this.generateRefreshToken(user),
        ]);

        // Cache user payload in Redis using JTI
        const refreshPayload = this.jwtService.decode<JwtPayload>(refreshToken);
        if (!isValidJwtPayload(refreshPayload)) {
            throw new BadRequestException('Failed to generate valid refresh token');
        }
        await this.cacheUserPayload(refreshPayload.jti, user);

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                isActive: user.isActive,
                emailVerified: user.emailVerified,
            },
            expiresIn: 15 * 60, // 15 minutes
            refreshExpiresIn: 7 * 24 * 60 * 60, // 7 days
        };
    }

    async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
        try {
            // First decode to get the keyId
            const decodedPayload = this.jwtService.decode<JwtPayload>(refreshToken);
            if (!isValidJwtPayload(decodedPayload)) {
                throw new UnauthorizedException('Invalid token format');
            }

            // Get the specific public key used to create this token
            const publicKey = await this.keyManagerService.getPublicKey(decodedPayload.keyId);
            if (!publicKey) {
                throw new UnauthorizedException('Key not found or revoked');
            }

            const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
                secret: publicKey,
                algorithms: ['RS256'],
            });

            // Check if JTI exists in Redis
            const cachedUser = await this.getCachedUserPayload(payload.jti);
            if (!cachedUser || cachedUser.id !== payload.sub) {
                throw new UnauthorizedException('Invalid refresh token');
            }

            // Check if user is still active
            if (!cachedUser.isActive) {
                throw new UnauthorizedException('User is inactive');
            }

            // Generate new tokens
            const [newAccessToken, newRefreshToken] = await Promise.all([
                this.generateAccessToken(cachedUser),
                this.generateRefreshToken(cachedUser),
            ]);

            // Invalidate old JTI and cache new one
            await this.invalidateUserPayload(payload.jti);
            const newRefreshPayload = this.jwtService.decode<JwtPayload>(newRefreshToken);
            if (!isValidJwtPayload(newRefreshPayload)) {
                throw new BadRequestException('Failed to generate valid refresh token');
            }
            await this.cacheUserPayload(newRefreshPayload.jti, cachedUser);

            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                user: {
                    id: cachedUser.id,
                    email: cachedUser.email,
                    firstName: cachedUser.firstName,
                    lastName: cachedUser.lastName,
                    role: cachedUser.role,
                    isActive: cachedUser.isActive,
                    emailVerified: cachedUser.emailVerified,
                },
                expiresIn: 15 * 60,
                refreshExpiresIn: 7 * 24 * 60 * 60,
            };
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async logout(refreshToken: string): Promise<void> {
        try {
            const payload = this.jwtService.decode<JwtPayload>(refreshToken);
            if (isValidJwtPayload(payload)) {
                await this.invalidateUserPayload(payload.jti);
            }
        } catch {
            // Ignore errors during logout
        }
    }

    async logoutAll(userId: string): Promise<void> {
        // Clear all sessions for user
        await this.redisService.del(`user_sessions:${userId}`);
    }

    private async generateAccessToken(user: UserInfo): Promise<string> {
        const activeKeyId = await this.keyManagerService.getActiveKey('access_token');
        const privateKey = await this.keyManagerService.getPrivateKey(activeKeyId);

        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            type: 'access',
            jti: randomUUID(),
            keyId: activeKeyId,
        };

        return this.jwtService.sign(payload, {
            secret: privateKey,
            algorithm: 'RS256',
            expiresIn: '15m',
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
        });
    }

    private async generateRefreshToken(user: UserInfo): Promise<string> {
        const activeKeyId = await this.keyManagerService.getActiveKey('refresh_token');
        const privateKey = await this.keyManagerService.getPrivateKey(activeKeyId);

        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            type: 'refresh',
            jti: randomUUID(),
            keyId: activeKeyId,
        };

        return this.jwtService.sign(payload, {
            secret: privateKey,
            algorithm: 'RS256',
            expiresIn: '7d',
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
        });
    }

    async verifyAccessToken(token: string): Promise<JwtPayload> {
        try {
            // First decode to get the keyId
            const decodedPayload = this.jwtService.decode<JwtPayload>(token);
            if (!isValidJwtPayload(decodedPayload)) {
                throw new UnauthorizedException('Invalid token format');
            }

            // Get the specific public key used to create this token
            const publicKey = await this.keyManagerService.getPublicKey(decodedPayload.keyId);
            if (!publicKey) {
                throw new UnauthorizedException('Key not found or revoked');
            }

            const payload = this.jwtService.verify<JwtPayload>(token, {
                secret: publicKey,
                algorithms: ['RS256'],
                issuer: JWT_ISSUER,
                audience: JWT_AUDIENCE,
            });

            if (payload.type !== 'access') {
                throw new UnauthorizedException('Invalid token type');
            }

            return payload;
        } catch {
            throw new UnauthorizedException('Invalid access token');
        }
    }

    private async cacheUserPayload(jti: string, user: UserInfo): Promise<void> {
        const key = `jwt_payload:${jti}`;
        await this.redisService.set(key, JSON.stringify(user), {
            ttl: 7 * 24 * 60 * 60, // 7 days
        });

        // Also track user sessions
        const userSessionsKey = `user_sessions:${user.id}`;
        await this.redisService.sadd(userSessionsKey, jti);
        await this.redisService.expire(userSessionsKey, 7 * 24 * 60 * 60);
    }

    private async getCachedUserPayload(jti: string): Promise<UserInfo | null> {
        const key = `jwt_payload:${jti}`;
        const cached = await this.redisService.get(key);
        return cached ? (JSON.parse(cached) as UserInfo) : null;
    }

    private async invalidateUserPayload(jti: string): Promise<void> {
        const key = `jwt_payload:${jti}`;
        await this.redisService.del(key);
    }
}
