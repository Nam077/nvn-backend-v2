import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { get } from 'lodash';

export interface AuthenticatedUser {
    id: string;
    email: string;
    role?: string;
    jti?: string;
    sid?: string; // 🔥 NEW: Session ID for optimized cache access
    keyId?: string;
}

/**
 * Decorator to extract user information from request
 * Used after JWT authentication to get current user data
 */
export const GetUser = createParamDecorator<keyof AuthenticatedUser | undefined, ExecutionContext>(
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    (property: keyof AuthenticatedUser | undefined, ctx: ExecutionContext): AuthenticatedUser | null | any => {
        const request: Request = ctx.switchToHttp().getRequest();
        const user: AuthenticatedUser = get(request, 'user');

        if (!user) {
            return null;
        }

        if (property) {
            return get(user, property);
        }

        return user;
    },
);
