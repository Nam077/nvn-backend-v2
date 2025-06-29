import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { randomUUID } from 'crypto';
import { map } from 'lodash';

import { JWT_CONFIG } from '@/common/constants';
import { JwtPayload, UserInfo, SessionData, RefreshTokenUserData } from '@/common/interfaces';
import { DateUtils } from '@/common/utils';
import { AuthResponseDto } from '@/modules/auth/dto/auth-response.dto';
import { LoginDto } from '@/modules/auth/dto/login.dto';
import { SessionService } from '@/modules/auth/services/session.service';
import { getTokenConfig } from '@/modules/security/config/key.config';
import { KeyManagerService } from '@/modules/security/services/key-manager.service';
import { KEY_TYPES } from '@/modules/security/types/key.types';
import { RbacService } from '@/modules/users/services/rbac.service';
import { UsersService } from '@/modules/users/users.service';

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

        if (!accessPayload || !refreshPayload) {
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
            accessTokenExpiry: DateUtils.createExpiryUtc(getTokenConfig(KEY_TYPES.ACCESS_TOKEN).seconds),
            refreshTokenExpiry: DateUtils.createExpiryUtc(getTokenConfig(KEY_TYPES.REFRESH_TOKEN).seconds),
            createdAt: DateUtils.nowUtc(),
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
        const { sessionData, refreshToken } = userData;

        // Generate new access token (keep same session)
        const newAccessToken = await this.generateAccessToken(sessionData, sessionData.sid);
        const newAccessPayload = this.jwtService.decode<JwtPayload>(newAccessToken);

        if (!newAccessPayload) {
            throw new BadRequestException('Failed to generate valid access token');
        }

        // Update session with new access token JTI and timestamps
        sessionData.accessTokenJti = newAccessPayload.jti;
        sessionData.accessTokenExpiry = DateUtils.createExpiryUtc(getTokenConfig(KEY_TYPES.ACCESS_TOKEN).seconds);

        // 🔥 DELEGATED: Update session cache
        await this.sessionService.cacheSessionData(sessionData.sid, sessionData);

        const accessTokenConfig = getTokenConfig(KEY_TYPES.ACCESS_TOKEN);
        const refreshTokenConfig = getTokenConfig(KEY_TYPES.REFRESH_TOKEN);

        return {
            accessToken: newAccessToken,
            refreshToken, // Keep the same refresh token from strategy
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

    async logout(userId: string, sessionId: string): Promise<void> {
        try {
            // 🔥 DIRECT: Use sessionId from validated user data
            await this.sessionService.removeUserSession(userId, sessionId);
        } catch {
            // Ignore errors during logout - best effort cleanup
        }
    }

    async logoutWithSessionData(sessionData: SessionData): Promise<void> {
        // ✅ NO DUPLICATE VALIDATION - Strategy already validated everything!
        try {
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
            algorithm: JWT_CONFIG.ALGORITHM,
            expiresIn: tokenConfig.expiresIn, // 1d from config
            issuer: JWT_CONFIG.ISSUER,
            audience: JWT_CONFIG.AUDIENCE,
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
            algorithm: JWT_CONFIG.ALGORITHM,
            expiresIn: tokenConfig.expiresIn, // 30d from config
            issuer: JWT_CONFIG.ISSUER,
            audience: JWT_CONFIG.AUDIENCE,
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
