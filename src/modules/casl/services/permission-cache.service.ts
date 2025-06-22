import { Injectable } from '@nestjs/common';

import { SessionService, CachedUserData } from '@/modules/auth/services/session.service';

@Injectable()
export class PermissionCacheService {
    constructor(private readonly sessionService: SessionService) {}

    // 🔥 OPTIMIZED: Direct delegation to SessionService
    async getCachedUserBySid(sessionId: string): Promise<CachedUserData | null> {
        return this.sessionService.getCachedUserBySid(sessionId);
    }

    async getCachedPermissionsBySid(sessionId: string): Promise<string[]> {
        return this.sessionService.getCachedPermissionsBySid(sessionId);
    }

    async getCachedRolesBySid(sessionId: string): Promise<Array<{ id: string; name: string; displayName?: string }>> {
        return this.sessionService.getCachedRolesBySid(sessionId);
    }

    // 🔥 BACKWARD COMPATIBILITY: JTI-based methods (for fallback)
    async getCachedUserByJti(jti: string): Promise<CachedUserData | null> {
        return this.sessionService.getCachedUserByJti(jti);
    }

    async getCachedPermissionsByJti(jti: string): Promise<string[]> {
        return this.sessionService.getCachedPermissionsByJti(jti);
    }

    async getCachedRolesByJti(jti: string): Promise<Array<{ id: string; name: string; displayName?: string }>> {
        return this.sessionService.getCachedRolesByJti(jti);
    }
}
