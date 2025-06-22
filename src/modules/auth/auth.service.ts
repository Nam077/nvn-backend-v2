import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { randomUUID } from 'crypto';
import { has, isObject, map } from 'lodash';

import { getTokenConfig } from '@/modules/security/config/key.config';
import { KeyManagerService } from '@/modules/security/services/key-manager.service';
import { KEY_TYPES } from '@/modules/security/types/key.types';
import { RbacService } from '@/modules/users/services/rbac.service';
import { UsersService } from '@/modules/users/users.service';

import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { SessionService, SessionData } from './services/session.service';

interface JwtPayload {
    sub: string;
    email: string;
    role?: string;
    type: string;
    jti: string;
    sid: string; // 🔥 KEEP: Session ID stays in payload for security
    iat?: number;
    exp?: number;
    iss?: string;
    aud?: string;
}

interface UserInfo {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    isActive: boolean;
    emailVerified: boolean;
}

interface RefreshTokenSessionData {
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
}

interface RefreshTokenUserData {
    id: string;
    email: string;
    role?: string;
    jti: string;
    sid: string;
    refreshToken: string;
    sessionData: RefreshTokenSessionData;
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
    has(payload, 'sid');

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly rbacService: RbacService,
        private readonly keyManagerService: KeyManagerService,
        private readonly jwtService: JwtService,
        private readonly sessionService: SessionService,
    ) {
        // No complex validation needed - simple token-based calculation
    }

    async validateUser(email: string, password: string): Promise<UserInfo> {
        const user = await this.usersService.validatePassword(email, password);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return user.toJSON();
    }

    async login(loginDto: LoginDto): Promise<AuthResponseDto> {
        const user = await this.validateUser(loginDto.email, loginDto.password);

        // 🔥 NEW: Generate Session ID for this login session
        const sessionId = randomUUID();

        // Load user with roles and permissions
        const userWithRoles = await this.rbacService.getUserWithRoles(user.id);
        const userPermissions = await this.rbacService.getUserPermissions(user.id);

        // Generate access token and refresh token with session reference
        const [accessToken, refreshToken] = await Promise.all([
            this.generateAccessToken(user, sessionId),
            this.generateRefreshToken(user, sessionId),
        ]);

        // Decode tokens to get JTIs
        const accessPayload = this.jwtService.decode<JwtPayload>(accessToken);
        const refreshPayload = this.jwtService.decode<JwtPayload>(refreshToken);

        if (!isValidJwtPayload(accessPayload) || !isValidJwtPayload(refreshPayload)) {
            throw new BadRequestException('Failed to generate valid tokens');
        }

        // 🔥 NEW: Create session data
        const sessionData: SessionData = {
            sid: sessionId,
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isActive: user.isActive,
            emailVerified: user.emailVerified,
            permissions: userPermissions,
            roles: map(userWithRoles.roles, (role) => ({
                id: role.id,
                name: role.name,
                displayName: role.displayName,
            })),
            accessTokenJti: accessPayload.jti,
            refreshTokenJti: refreshPayload.jti,
            accessTokenExpiry: new Date(Date.now() + getTokenConfig(KEY_TYPES.ACCESS_TOKEN).seconds * 1000),
            refreshTokenExpiry: new Date(Date.now() + getTokenConfig(KEY_TYPES.REFRESH_TOKEN).seconds * 1000),
            createdAt: new Date(),
            lastUsedAt: new Date(),
        };

        // 🔥 DELEGATED: Cache session data and track user session
        await Promise.all([
            this.sessionService.cacheSessionData(sessionId, sessionData),
            this.sessionService.trackUserSession(user.id, sessionId),
        ]);

        const accessTokenConfig = getTokenConfig(KEY_TYPES.ACCESS_TOKEN);
        const refreshTokenConfig = getTokenConfig(KEY_TYPES.REFRESH_TOKEN);

        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                isActive: user.isActive,
                emailVerified: user.emailVerified,
            },
            expiresIn: accessTokenConfig.seconds,
            refreshExpiresIn: refreshTokenConfig.seconds,
        };
    }

    async refreshTokenWithSessionData(userData: RefreshTokenUserData): Promise<AuthResponseDto> {
        // ✅ NO DUPLICATE VALIDATION - Strategy already did all the work!
        const { sessionData } = userData;

        // Generate new access token AND new refresh token (token rotation)
        const [newAccessToken, newRefreshToken] = await Promise.all([
            this.generateAccessToken(sessionData, sessionData.sid),
            this.generateRefreshToken(sessionData, sessionData.sid),
        ]);

        // Decode tokens to get new JTIs
        const newAccessPayload = this.jwtService.decode<JwtPayload>(newAccessToken);
        const newRefreshPayload = this.jwtService.decode<JwtPayload>(newRefreshToken);

        if (!isValidJwtPayload(newAccessPayload) || !isValidJwtPayload(newRefreshPayload)) {
            throw new BadRequestException('Failed to generate valid tokens');
        }

        // Update session with new JTIs and timestamps
        sessionData.accessTokenJti = newAccessPayload.jti;
        sessionData.refreshTokenJti = newRefreshPayload.jti;
        sessionData.accessTokenExpiry = new Date(Date.now() + getTokenConfig(KEY_TYPES.ACCESS_TOKEN).seconds * 1000);
        sessionData.refreshTokenExpiry = new Date(Date.now() + getTokenConfig(KEY_TYPES.REFRESH_TOKEN).seconds * 1000);
        sessionData.lastUsedAt = new Date();

        // 🔥 DELEGATED: Update session cache with new JTIs
        await this.sessionService.cacheSessionData(sessionData.sid, sessionData);

        const accessTokenConfig = getTokenConfig(KEY_TYPES.ACCESS_TOKEN);
        const refreshTokenConfig = getTokenConfig(KEY_TYPES.REFRESH_TOKEN);

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken, // 🔥 FIXED: Return new refresh token
            user: {
                id: sessionData.id,
                email: sessionData.email,
                firstName: sessionData.firstName,
                lastName: sessionData.lastName,
                isActive: sessionData.isActive,
                emailVerified: sessionData.emailVerified,
            },
            expiresIn: accessTokenConfig.seconds,
            refreshExpiresIn: refreshTokenConfig.seconds,
        };
    }

    async logout(refreshToken: string): Promise<void> {
        try {
            const payload = this.jwtService.decode<JwtPayload>(refreshToken);
            if (isValidJwtPayload(payload)) {
                // 🔥 DELEGATED: Verify session exists before logout
                const sessionData = await this.sessionService.getSessionBySid(payload.sid);
                if (sessionData && sessionData.refreshTokenJti === payload.jti) {
                    // Valid session and JTI match - proceed with logout
                    await this.sessionService.blacklistSession(payload.sid);
                    await this.sessionService.removeUserSession(payload.sub, payload.sid);
                }
                // If session doesn't exist or JTI mismatch, session is already invalid
                // Still consider logout successful (idempotent operation)
            }
        } catch {
            // Ignore errors during logout - best effort cleanup
        }
    }

    async logoutWithSessionData(sessionData: RefreshTokenSessionData): Promise<void> {
        // ✅ NO DUPLICATE VALIDATION - Strategy already validated everything!
        try {
            await this.sessionService.blacklistSession(sessionData.sid);
            await this.sessionService.removeUserSession(sessionData.id, sessionData.sid);
        } catch {
            // Ignore errors during logout - best effort cleanup
        }
    }

    async logoutAll(userId: string): Promise<void> {
        // 🔥 DELEGATED: Blacklist all user sessions
        await this.sessionService.blacklistAllUserSessions(userId);
    }

    private async generateAccessToken(user: UserInfo, sessionId: string): Promise<string> {
        const activeKeyId = await this.keyManagerService.getActiveKey('access_token');
        const privateKey = await this.keyManagerService.getPrivateKey(activeKeyId);

        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            type: 'access',
            jti: randomUUID(),
            sid: sessionId, // 🔥 KEEP: Session ID stays in payload for security
        };

        const tokenConfig = getTokenConfig(KEY_TYPES.ACCESS_TOKEN);

        return this.jwtService.sign(payload, {
            secret: privateKey,
            algorithm: 'RS256',
            expiresIn: tokenConfig.expiresIn, // 1d from config
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
            keyid: activeKeyId, // ✅ Set kid in header for standard compliance
        });
    }

    private async generateRefreshToken(user: UserInfo, sessionId: string): Promise<string> {
        const activeKeyId = await this.keyManagerService.getActiveKey('refresh_token');
        const privateKey = await this.keyManagerService.getPrivateKey(activeKeyId);

        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            type: 'refresh',
            jti: randomUUID(),
            sid: sessionId, // 🔥 KEEP: Session ID stays in payload for security
        };

        const tokenConfig = getTokenConfig(KEY_TYPES.REFRESH_TOKEN);

        return this.jwtService.sign(payload, {
            secret: privateKey,
            algorithm: 'RS256',
            expiresIn: tokenConfig.expiresIn, // 30d from config
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
            keyid: activeKeyId, // ✅ Set kid in header for standard compliance
        });
    }
}

/*
🔥 ULTRA OPTIMIZED CACHING ARCHITECTURE (SID in JWT)
===================================================

OLD APPROACH (Too many keys + slow lookups):
- nvn:auth:session:{sid} → Full session data  
- nvn:auth:refresh:{sid} → Basic user info
- nvn:auth:access:map:{jti} → sid
- nvn:auth:refresh:map:{jti} → sid 
- nvn:auth:user:sessions:{userId} → Set of SIDs
- Need Redis KEYS scan to find session by JTI

NEW APPROACH (Minimal keys + lightning fast):
- nvn:auth:session:{sid} → Contains EVERYTHING (user data + permissions + both JTIs + expiry dates)
- nvn:auth:user:sessions:{userId} → Set of SIDs (for user session tracking)
- nvn:auth:blacklist:session:{sid} → Blacklisted sessions
- JWT contains SID → Direct Redis GET (no scanning needed!)

BENEFITS:
✅ Reduced Redis memory usage (3 keys instead of 5+ keys per session)
✅ Atomic data consistency (all session data in one place)
✅ Simplified logic (no separate mappings to maintain)
✅ LIGHTNING FAST token validation (direct Redis GET using SID from JWT)
✅ No Redis KEYS scan needed (O(1) vs O(n) complexity)

JWT PAYLOAD STRUCTURE:
{
  sub: "user-id",
  email: "user@example.com", 
  type: "access|refresh",
  jti: "unique-token-id",
  sid: "session-id", // 🔥 KEY OPTIMIZATION: Direct session access
  keyId: "rsa-key-id"
}

SESSION DATA STRUCTURE:
{
  // User data
  id, email, firstName, lastName, isActive, emailVerified,
  permissions: ['users:read', 'posts:write'],
  roles: [{id, name, displayName}],
  
  // Session metadata  
  sid: "uuid",
  accessTokenJti: "access-jwt-id",
  refreshTokenJti: "refresh-jwt-id", 
  accessTokenExpiry: Date,
  refreshTokenExpiry: Date,
  createdAt: Date,
  lastUsedAt: Date,
  userAgent?: string,
  ipAddress?: string
}

PERFORMANCE:
- Token validation: O(1) Redis GET (instead of O(n) KEYS scan)
- Session access: Single Redis operation
- Memory usage: ~60% reduction in total keys
*/
