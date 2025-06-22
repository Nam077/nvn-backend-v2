import { Injectable } from '@nestjs/common';

import { map, omit } from 'lodash';

import { RedisService } from '@/modules/redis/redis.service';
import { getTokenConfig } from '@/modules/security/config/key.config';
import { KEY_TYPES } from '@/modules/security/types/key.types';

// Redis Cache Key Prefixes - ULTRA OPTIMIZED
const CACHE_KEYS = {
    SESSION_DATA: 'nvn:auth:session', // nvn:auth:session:{sid} - Contains everything: user data + JTIs + permissions
    USER_SESSIONS: 'nvn:auth:user:sessions', // nvn:auth:user:sessions:{userId} - Set of SIDs

    // Blacklists (still needed for security)
    BLACKLIST_SESSION: 'nvn:auth:blacklist:session', // nvn:auth:blacklist:session:{sid}
    BLACKLIST_TOKEN: 'nvn:auth:blacklist:token', // nvn:auth:blacklist:token:{jti}

    // Rate limiting
    RATE_LIMIT: 'nvn:auth:rate:limit',
    LOGIN_ATTEMPTS: 'nvn:auth:login:attempts',
} as const;

// Session data interfaces
export interface CachedUserData {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    isActive: boolean;
    emailVerified: boolean;
    permissions: string[];
    roles: Array<{
        id: string;
        name: string;
        displayName?: string;
    }>;
}

export interface SessionData extends CachedUserData {
    sid: string;
    accessTokenJti: string;
    refreshTokenJti: string;
    accessTokenExpiry: Date;
    refreshTokenExpiry: Date;
    createdAt: Date;
    lastUsedAt: Date;
    userAgent?: string;
    ipAddress?: string;
}

@Injectable()
export class SessionService {
    constructor(private readonly redisService: RedisService) {}

    // 🔥 SUPER FAST: Direct session access using SID
    async getSessionBySid(sessionId: string): Promise<SessionData | null> {
        const sessionKey = `${CACHE_KEYS.SESSION_DATA}:${sessionId}`;
        const cached = await this.redisService.get(sessionKey);
        if (!cached) return null;
        return JSON.parse(cached) as SessionData;
    }

    async validateSession({
        sessionId,
        jti,
        type,
        userId,
    }: {
        sessionId: string;
        jti: string;
        type: 'access' | 'refresh';
        userId: string;
    }): Promise<SessionData | null> {
        const cleanupAndReturnNull = async (): Promise<null> => {
            await this.removeSessionFromCache(sessionId, userId);
            return null;
        };

        if (!(await this.isChildUserSessionId(sessionId, userId))) {
            return cleanupAndReturnNull();
        }

        const sessionData = await this.getSessionBySid(sessionId);
        if (!sessionData) return null;

        if (await this.isSessionBlacklisted(sessionId)) {
            return cleanupAndReturnNull();
        }

        if (new Date() > sessionData.accessTokenExpiry) {
            return cleanupAndReturnNull();
        }

        const expectedJti = type === 'access' ? sessionData.accessTokenJti : sessionData.refreshTokenJti;
        if (expectedJti !== jti) {
            return cleanupAndReturnNull();
        }

        return sessionData;
    }

    // 🔥 BACKWARD COMPATIBILITY: For JTI-based access (fallback method)
    async getSessionByJti(jti: string): Promise<SessionData | null> {
        const sessionKeys = await this.redisService.keys(`${CACHE_KEYS.SESSION_DATA}:*`);

        for (const sessionKey of sessionKeys) {
            const cached = await this.redisService.get(sessionKey);
            if (cached) {
                const sessionData = JSON.parse(cached) as SessionData;
                if (sessionData.accessTokenJti === jti || sessionData.refreshTokenJti === jti) {
                    return sessionData;
                }
            }
        }

        return null;
    }

    // Cache session data with refresh token TTL
    async cacheSessionData(sessionId: string, sessionData: SessionData): Promise<void> {
        const sessionKey = `${CACHE_KEYS.SESSION_DATA}:${sessionId}`;
        const refreshTokenConfig = getTokenConfig(KEY_TYPES.REFRESH_TOKEN);

        await this.redisService.set(sessionKey, JSON.stringify(sessionData), {
            ttl: refreshTokenConfig.seconds,
        });
    }
    async isChildUserSessionId(sessionId: string, userId: string): Promise<boolean> {
        const userSessionsKey = `${CACHE_KEYS.USER_SESSIONS}:${userId}`;
        const isMember = await this.redisService.sismember(userSessionsKey, sessionId);
        return isMember === 1;
    }

    // Track user session
    async trackUserSession(userId: string, sessionId: string): Promise<void> {
        const userSessionsKey = `${CACHE_KEYS.USER_SESSIONS}:${userId}`;
        const refreshTokenConfig = getTokenConfig(KEY_TYPES.REFRESH_TOKEN);

        await this.redisService.sadd(userSessionsKey, sessionId);
        await this.redisService.expire(userSessionsKey, refreshTokenConfig.seconds);
    }

    // Remove user session
    async removeUserSession(userId: string, sessionId: string): Promise<void> {
        const userSessionsKey = `${CACHE_KEYS.USER_SESSIONS}:${userId}`;
        await this.redisService.srem(userSessionsKey, sessionId);
    }

    // Get all user sessions
    async getUserSessions(userId: string): Promise<string[]> {
        const userSessionsKey = `${CACHE_KEYS.USER_SESSIONS}:${userId}`;
        return this.redisService.smembers(userSessionsKey);
    }

    // Blacklist session
    async blacklistSession(sessionId: string): Promise<void> {
        const blacklistKey = `${CACHE_KEYS.BLACKLIST_SESSION}:${sessionId}`;
        const refreshTokenConfig = getTokenConfig(KEY_TYPES.REFRESH_TOKEN);

        await this.redisService.set(blacklistKey, 'blacklisted', {
            ttl: refreshTokenConfig.seconds,
        });
    }

    // Check if session is blacklisted
    async isSessionBlacklisted(sessionId: string): Promise<boolean> {
        const blacklistKey = `${CACHE_KEYS.BLACKLIST_SESSION}:${sessionId}`;
        const exists = await this.redisService.exists(blacklistKey);
        return exists > 0;
    }

    // 🔥 OPTIMIZED: Get user data using SID
    async getCachedUserBySid(sessionId: string): Promise<CachedUserData | null> {
        const sessionData = await this.getSessionBySid(sessionId);
        if (!sessionData) return null;

        // Convert SessionData to CachedUserData using lodash omit
        const userData = omit(sessionData, [
            'sid',
            'accessTokenJti',
            'refreshTokenJti',
            'accessTokenExpiry',
            'refreshTokenExpiry',
            'createdAt',
            'lastUsedAt',
            'userAgent',
            'ipAddress',
        ]);
        return userData as CachedUserData;
    }

    // 🔥 BACKWARD COMPATIBILITY: JTI-based methods
    async getCachedUserByJti(jti: string): Promise<CachedUserData | null> {
        const sessionData = await this.getSessionByJti(jti);
        if (!sessionData) return null;

        // Use lodash omit to extract userData without session metadata
        const userData = omit(sessionData, [
            'sid',
            'accessTokenJti',
            'refreshTokenJti',
            'accessTokenExpiry',
            'refreshTokenExpiry',
            'createdAt',
            'lastUsedAt',
            'userAgent',
            'ipAddress',
        ]);
        return userData as CachedUserData;
    }

    async getCachedPermissionsByJti(jti: string): Promise<string[]> {
        const sessionData = await this.getSessionByJti(jti);
        return sessionData?.permissions || [];
    }

    async getCachedRolesByJti(jti: string): Promise<Array<{ id: string; name: string; displayName?: string }>> {
        const sessionData = await this.getSessionByJti(jti);
        return sessionData?.roles || [];
    }

    // Bulk operations for logout all
    async blacklistAllUserSessions(userId: string): Promise<void> {
        const sessions = await this.getUserSessions(userId);

        if (sessions.length > 0) {
            const blacklistPromises = map(sessions, (sessionId) => this.blacklistSession(sessionId));
            await Promise.all(blacklistPromises);
        }

        // Clear the user sessions set
        const userSessionsKey = `${CACHE_KEYS.USER_SESSIONS}:${userId}`;
        await this.redisService.del(userSessionsKey);
    }

    async removeSessionFromCache(sessionId: string, userId: string): Promise<void> {
        const sessionKey = `${CACHE_KEYS.SESSION_DATA}:${sessionId}`;
        await this.redisService.del(sessionKey);

        const userSessionsKey = `${CACHE_KEYS.USER_SESSIONS}:${userId}`;
        await this.redisService.srem(userSessionsKey, sessionId);
    }
}
