import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { some } from 'lodash';

import { User } from '@/modules/users/entities/user.entity';

import { ROLES_KEY } from '../decorators/roles.decorator';

interface RequestWithUser extends Request {
    user: User;
}

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredRoles) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest<RequestWithUser>();

        if (!user) {
            return false;
        }

        return some(requiredRoles, (role) => user.role === role);
    }
}
