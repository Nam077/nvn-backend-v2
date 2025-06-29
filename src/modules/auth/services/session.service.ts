import { Injectable } from '@nestjs/common';

import { map, omit } from 'lodash';

import { getCacheKey } from '@/common/constants';
import { SessionData, CachedUserData } from '@/common/interfaces';
import { DateUtils } from '@/common/utils';
import { RedisService } from '@/modules/redis/redis.service';
import { getTokenConfig } from '@/modules/security/config/key.config';
import { KEY_TYPES } from '@/modules/security/types/key.types';

@Injectable()
export class SessionService {
    constructor(private readonly redisService: RedisService) {}

    // 🔥 SUPER FAST: Direct session access using SID
    async getSessionBySid(sessionId: string): Promise<SessionData | null> {
        const sessionKey = getCacheKey.sessionData(sessionId);
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

        if (DateUtils.isExpiredUtc(sessionData.accessTokenExpiry)) {
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
        const sessionKeys = await this.redisService.keys('nvn:auth:session:*');

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
        const sessionKey = getCacheKey.sessionData(sessionId);
        const refreshTokenConfig = getTokenConfig(KEY_TYPES.REFRESH_TOKEN);

        await this.redisService.set(sessionKey, JSON.stringify(sessionData), {
            ttl: refreshTokenConfig.seconds,
        });
    }

    async isChildUserSessionId(sessionId: string, userId: string): Promise<boolean> {
        const userSessionsKey = getCacheKey.userSessions(userId);
        const isMember = await this.redisService.sismember(userSessionsKey, sessionId);
        return isMember === 1;
    }

    // Track user session
    async trackUserSession(userId: string, sessionId: string): Promise<void> {
        const userSessionsKey = getCacheKey.userSessions(userId);
        const refreshTokenConfig = getTokenConfig(KEY_TYPES.REFRESH_TOKEN);

        await this.redisService.sadd(userSessionsKey, sessionId);
        await this.redisService.expire(userSessionsKey, refreshTokenConfig.seconds);
    }

    // Remove user session
    async removeUserSession(userId: string, sessionId: string): Promise<void> {
        const userSessionsKey = getCacheKey.userSessions(userId);
        await this.redisService.srem(userSessionsKey, sessionId);
    }

    // Get all user sessions
    async getUserSessions(userId: string): Promise<string[]> {
        const userSessionsKey = getCacheKey.userSessions(userId);
        return this.redisService.smembers(userSessionsKey);
    }

    // Blacklist session
    async blacklistSession(sessionId: string): Promise<void> {
        const blacklistKey = getCacheKey.blacklistSession(sessionId);
        const refreshTokenConfig = getTokenConfig(KEY_TYPES.REFRESH_TOKEN);

        await this.redisService.set(blacklistKey, 'blacklisted', {
            ttl: refreshTokenConfig.seconds,
        });
    }

    // Check if session is blacklisted
    async isSessionBlacklisted(sessionId: string): Promise<boolean> {
        const blacklistKey = getCacheKey.blacklistSession(sessionId);
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
        const userSessionsKey = getCacheKey.userSessions(userId);
        await this.redisService.del(userSessionsKey);
    }

    // Delete all user sessions instead of blacklisting
    async deleteAllUserSessions(userId: string): Promise<void> {
        const sessions = await this.getUserSessions(userId);

        if (sessions.length > 0) {
            // Delete all session data from cache
            const deletePromises = map(sessions, (sessionId) => {
                const sessionKey = getCacheKey.sessionData(sessionId);
                return this.redisService.del(sessionKey);
            });
            await Promise.all(deletePromises);
        }

        // Clear the user sessions set
        const userSessionsKey = getCacheKey.userSessions(userId);
        await this.redisService.del(userSessionsKey);
    }

    async removeSessionFromCache(sessionId: string, userId: string): Promise<void> {
        const sessionKey = getCacheKey.sessionData(sessionId);
        await this.redisService.del(sessionKey);

        const userSessionsKey = getCacheKey.userSessions(userId);
        await this.redisService.srem(userSessionsKey, sessionId);
    }
}
