import { ApiProperty } from '@nestjs/swagger';

import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
    @ApiProperty({ description: 'The name of the category.', example: 'Vintage Fonts' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        description: 'A detailed description of the category.',
        example: 'Fonts with a classic, retro feel.',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ description: 'The parent category ID.', example: '123e4567-e89b-12d3-a456-426614174000' })
    @IsOptional()
    @IsString()
    parentId?: string;
}
