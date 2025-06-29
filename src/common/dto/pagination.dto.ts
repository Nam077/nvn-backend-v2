import { ApiPropertyOptional } from '@nestjs/swagger';

import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, IsString } from 'class-validator';

import { ClampNumber } from '../decorators/clamp-number.decorator';

const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

export class PaginationDto {
    @ApiPropertyOptional({ description: 'Page number', default: 1, type: Number })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page? = 1;

    @ApiPropertyOptional({ description: 'Number of items per page', default: 10, type: Number })
    @IsOptional()
    @ClampNumber({ min: MIN_LIMIT, max: MAX_LIMIT })
    @IsInt()
    limit? = 10;

    @ApiPropertyOptional({ description: 'Search query string', example: 'Myriad Pro' })
    @IsOptional()
    @IsString()
    q?: string;
}
