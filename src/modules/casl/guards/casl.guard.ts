import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Request } from 'express';
import { get } from 'lodash';

import { CachedUserData, SessionService } from '@/modules/auth/services/session.service';
import { RequiredRule, CHECK_ABILITY_KEY } from '@/modules/casl/decorators/check-abilities.decorator';
import { AbilityFactory } from '@/modules/casl/factories/ability.factory';
import { AppAbility } from '@/modules/casl/types/casl.types';

interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        role?: string;
        jti?: string;
        sid?: string; // 🔥 NEW: Session ID for fast cache access
        keyId?: string;
    };
}

@Injectable()
export class CaslGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly abilityFactory: AbilityFactory,
        private readonly sessionService: SessionService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const rules = this.reflector.get<RequiredRule[]>(CHECK_ABILITY_KEY, context.getHandler()) || [];

        if (rules.length === 0) {
            return true; // No abilities required
        }

        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
        const { user } = request;

        if (!user?.id) {
            throw new ForbiddenException('User not authenticated');
        }

        try {
            let cachedUserData: CachedUserData | null;

            // 🔥 OPTIMIZED: Use SID for O(1) cache access if available, fallback to JTI
            if (get(user, 'sid')) {
                cachedUserData = await this.sessionService.getCachedUserBySid(get(user, 'sid'));
            }

            if (!cachedUserData) {
                throw new ForbiddenException('User session not found in cache');
            }

            const ability = this.abilityFactory.createForUser(cachedUserData);

            return this.checkUserAbilities(ability, rules);
        } catch (error) {
            if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new ForbiddenException('Access denied');
        }
    }

    private checkUserAbilities(ability: AppAbility, rules: RequiredRule[]): boolean {
        for (const rule of rules) {
            if (!this.checkSingleRule(ability, rule)) {
                return false;
            }
        }
        return true;
    }

    private checkSingleRule(ability: AppAbility, rule: RequiredRule): boolean {
        const { action, subject, conditions, inverted } = rule;

        const canPerform: boolean = conditions
            ? // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
              ability.can(action, subject, conditions as any)
            : ability.can(action, subject);

        const allowed: boolean = inverted ? !canPerform : canPerform;

        if (!allowed) {
            const subjectStr = typeof subject === 'object' ? JSON.stringify(subject) : String(subject);
            throw new ForbiddenException(
                `User cannot ${action} ${subjectStr}${conditions ? ' with given conditions' : ''}`,
            );
        }

        return true;
    }
}
