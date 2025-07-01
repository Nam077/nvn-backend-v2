import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

import { JsonLogicRuleNode } from '../query-builder/json-logic-to-sql.builder';

export class OrderDto {
    @ApiProperty({ description: 'Field to sort by', example: 'createdAt' })
    @IsString()
    field: string;

    @ApiProperty({ description: 'Sort direction: 1 for ASC, -1 for DESC', enum: [1, -1], example: -1 })
    @Type(() => Number)
    @IsNumber()
    @IsIn([1, -1])
    direction: 1 | -1;
}

class BaseQueryDto {
    @ApiPropertyOptional({
        description: 'Array of fields to sort by.',
        type: [OrderDto],
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderDto)
    order?: OrderDto[];

    @ApiPropertyOptional({
        description: 'Array of field names to include in the response.',
        type: [String],
        example: ['id', 'email', 'firstName', 'lastName'],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    select?: string[];
}

export const createCustomQueryDto = (filterExample: Record<string, any>) => {
    class CustomQueryDto extends BaseQueryDto {
        @ApiProperty({
            description: 'JsonLogic rule for filtering records.',
            type: 'object',
            example: filterExample,
            additionalProperties: true,
        })
        @IsOptional()
        @IsObject()
        filter: JsonLogicRuleNode;
    }
    return CustomQueryDto;
};

export class QueryDto extends createCustomQueryDto({ and: [{ '==': [{ var: 'email' }, 'test@example.com'] }] }) {}
