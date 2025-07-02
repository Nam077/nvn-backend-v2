import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';

import { QueryValidationGuard } from '@/modules/query-validation/guards/query-validation.guard';

export const QUERY_CONFIG_KEY = 'query_config_key';

export const ValidateQuery = (key: string) =>
    applyDecorators(SetMetadata(QUERY_CONFIG_KEY, key), UseGuards(QueryValidationGuard));
