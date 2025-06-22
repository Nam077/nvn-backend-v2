import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Type } from 'class-transformer';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class HashSetDto {
    @ApiProperty({ description: 'Hash field-value pairs', example: { name: 'John', age: '30', city: 'NYC' } })
    @IsNotEmpty()
    fields: Record<string, string>;

    @ApiPropertyOptional({ description: 'TTL in seconds', example: 3600 })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    ttl?: number;
}

export class PublishDto {
    @ApiProperty({ description: 'Message to publish', example: 'Hello subscribers!' })
    @IsNotEmpty()
    @IsString()
    message: string;
}

export class PushListDto {
    @ApiProperty({ description: 'Array of values to push', example: ['item1', 'item2'] })
    @IsArray()
    @IsString({ each: true })
    values: string[];

    @ApiPropertyOptional({ description: 'Push direction', enum: ['left', 'right'], example: 'right' })
    @IsOptional()
    @IsString()
    direction?: 'left' | 'right';
}

export class SetAddDto {
    @ApiProperty({ description: 'Array of members to add to set', example: ['member1', 'member2'] })
    @IsArray()
    @IsString({ each: true })
    members: string[];
}

export class SetJsonDto {
    @ApiProperty({ description: 'JSON data to store', example: { name: 'John', age: 30 } })
    @IsNotEmpty()
    data: unknown;

    @ApiPropertyOptional({ description: 'TTL in seconds', example: 3600 })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    ttl?: number;
}

export class SetRedisDto {
    @ApiProperty({ description: 'Value to set', example: 'test value' })
    @IsNotEmpty()
    @IsString()
    value: string;

    @ApiPropertyOptional({ description: 'TTL in seconds', example: 3600 })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    ttl?: number;
}

export class SortedSetAddDto {
    @ApiProperty({
        description: 'Array of score-member pairs',
        example: [
            { score: 1.5, member: 'player1' },
            { score: 2.3, member: 'player2' },
        ],
    })
    @IsArray()
    members: Array<{ score: number; member: string }>;
}
