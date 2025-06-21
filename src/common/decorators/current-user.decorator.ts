import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { get } from 'lodash';

import { User } from '@/modules/users/entities/user.entity';

interface RequestWithUser extends Request {
    user: User;
}

export const CurrentUser = createParamDecorator((data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = get(request, 'user');

    if (!user) {
        return undefined;
    }
    if (data) {
        return get(user, data) as unknown;
    }

    return user;
});
