import { ApiProperty } from '@nestjs/swagger';

import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';

import { CreateCategoryDto } from './create-category.dto';

export class BulkCreateCategoryDto {
    @ApiProperty({
        description: 'An array of category objects to create.',
        type: [CreateCategoryDto],
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateCategoryDto)
    items: CreateCategoryDto[];
}
