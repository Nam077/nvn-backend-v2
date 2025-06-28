import { ApiPropertyOptional } from '@nestjs/swagger';

import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min, IsString } from 'class-validator';

export class PaginationDto {
    @ApiPropertyOptional({ description: 'Page number', default: 1, type: Number })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page? = 1;

    @ApiPropertyOptional({ description: 'Number of items per page', default: 10, type: Number })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit? = 10;

    @ApiPropertyOptional({ description: 'Search query string', example: 'Myriad Pro' })
    @IsOptional()
    @IsString()
    q?: string;
}
