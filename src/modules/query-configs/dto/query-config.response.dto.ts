import { ApiProperty } from '@nestjs/swagger';

import { plainToInstance } from 'class-transformer';
import { assign } from 'lodash';

import { QueryConfig } from '../entities/query-config.entity';

export class QueryConfigResponseDto {
    @ApiProperty({
        example: '00f6b8a8-b4b0-45b6-a49d-3211e741b8a7',
        description: 'The unique identifier for the query configuration.',
    })
    id: string;

    @ApiProperty({
        example: 'FONT_MANAGEMENT_VIEW',
        description: 'The key identifying the configuration.',
    })
    key: string;

    @ApiProperty({
        type: 'object',
        example: { fields: { name: { type: 'text' } } },
        description: 'The JSON value of the configuration.',
        additionalProperties: true,
    })
    value: Record<string, any>;

    @ApiProperty({
        example: 'a4a9b6c1-b2e1-4af7-a3f2-89e4a39b3a3d',
        description: 'The ID of the user who owns this configuration. Null for default configs.',
        nullable: true,
    })
    userId: string | null;

    constructor(queryConfig: QueryConfig) {
        assign(this, plainToInstance(QueryConfigResponseDto, queryConfig, { excludeExtraneousValues: true }));
    }
}
