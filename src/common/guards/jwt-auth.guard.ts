import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { isEmpty } from 'lodash';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    canActivate(context: ExecutionContext) {
        return super.canActivate(context);
    }

    handleRequest(err: any, user: any): any {
        if (err || isEmpty(user)) {
            throw err || new UnauthorizedException('Invalid or expired token');
        }
        return user;
    }
}
