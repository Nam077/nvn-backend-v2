import { Injectable, CanActivate, ExecutionContext, Inject, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Request } from 'express';

import { AuthenticatedUser } from '@/common/interfaces/auth.interface';
import { CompleteQueryRequest, JsonLogicValidator, QueryConfig } from '@/common/validators/json-logic.validator';

import { QUERY_CONFIG_KEY } from '../decorators/validate-query.decorator';
import { QueryConfigLoaderService } from '../services/query-config-loader.service';

@Injectable()
export class QueryValidationGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        @Inject(QueryConfigLoaderService)
        private readonly configLoader: QueryConfigLoaderService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const key = this.reflector.get<string>(QUERY_CONFIG_KEY, context.getHandler());
        if (!key) {
            // This should not happen if the guard is applied correctly via the decorator
            return true;
        }

        const request: Request = context.switchToHttp().getRequest();
        const user = request.user as AuthenticatedUser | undefined;
        const query = request.body as CompleteQueryRequest;

        if (!query || typeof query !== 'object') {
            // Let other validators (like DTOs) handle empty body cases.
            return true;
        }

        try {
            const blueprint = await this.configLoader.findConfigForKey(key, user?.id || null);
            JsonLogicValidator.validateCompleteQuery(blueprint as QueryConfig, query);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Invalid query structure.';
            throw new BadRequestException(message);
        }

        return true;
    }
}
