import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { JsonLogicRuleNode } from '@/common/query-builder/json-logic-to-sql.builder';

export class QueryFontsCursorDto {
    @IsOptional()
    filter?: JsonLogicRuleNode;

    @IsOptional()
    @IsString()
    cursor?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    @IsOptional()
    @IsString()
    sort?: string;
}
