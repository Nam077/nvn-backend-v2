import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class DynamicJwtAuthGuard extends AuthGuard('dynamic-jwt') {
    canActivate(context: ExecutionContext) {
        return super.canActivate(context);
    }
}
