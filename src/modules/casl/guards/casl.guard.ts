import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Request } from 'express';
import { get, isFunction, isObject, isString } from 'lodash';

import { AuthenticatedUser, CachedUserData } from '@/common/interfaces';
import { SessionService } from '@/modules/auth/services/session.service';
import { RequiredRule, CHECK_ABILITY_KEY } from '@/modules/casl/decorators/check-abilities.decorator';
import { AbilityFactory } from '@/modules/casl/factories/ability.factory';
import { AppAbility } from '@/modules/casl/types/casl.types';

interface AuthenticatedRequest extends Request {
    user?: AuthenticatedUser;
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
            // Custom error message formatting
            const subjectName = this.getSubjectDisplayName(subject);
            const actionStr = String(action);
            const conditionsStr = conditions ? ' with given conditions' : '';

            throw new ForbiddenException(`Access denied: Cannot ${actionStr} ${subjectName}${conditionsStr}`);
        }

        return true;
    }

    /**
     * Get user-friendly display name for subjects
     * @param {unknown} subject - The subject to get the display name for
     * @returns {string} The display name for the subject
     */
    private getSubjectDisplayName(subject: unknown): string {
        // Handle class constructors
        if (isFunction(subject)) {
            return get(subject, 'name', 'Resource') as string;
        }

        // Handle string subjects
        if (isString(subject)) {
            return subject;
        }

        // Handle objects with constructor name
        if (isObject(subject) && subject !== null) {
            const constructorName = get(subject, 'constructor.name');
            if (constructorName && isString(constructorName)) {
                return constructorName;
            }
        }

        return 'Resource';
    }
}
