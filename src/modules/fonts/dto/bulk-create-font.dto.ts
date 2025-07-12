import { ApiProperty } from '@nestjs/swagger';

import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';

import { CreateFontDto } from './create-font.dto';

export class BulkCreateFontDto {
    @ApiProperty({
        description: 'An array of font objects to create.',
        type: [CreateFontDto],
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateFontDto)
    items: CreateFontDto[];
}
