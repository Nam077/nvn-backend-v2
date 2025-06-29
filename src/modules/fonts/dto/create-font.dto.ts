import { ApiProperty } from '@nestjs/swagger';

import { Type } from 'class-transformer';
import {
    IsString,
    IsNotEmpty,
    IsOptional,
    IsUUID,
    IsEnum,
    IsNumber,
    Min,
    IsBoolean,
    IsObject,
    IsArray,
    ValidateNested,
} from 'class-validator';

import { IsUuidOrStringArray } from '@/common/validators/is-uuid-or-string.validator';

import { FONT_TYPE, FontType, FontGalleryImage, FontAuthor } from '../entities/font.entity';

class FontGalleryImageDto implements FontGalleryImage {
    @ApiProperty({ description: 'The UUID of the file.', example: 'b7b5c6e8-34a0-4f51-8a19-1c19b9d4c7b8' })
    @IsUUID()
    @IsOptional()
    fileId?: string;

    @ApiProperty({ description: 'The URL of the image.', example: 'https://example.com/image.jpg' })
    @IsOptional()
    @IsString()
    url?: string;

    @ApiProperty({ description: 'The display order of the image.', example: 1 })
    @IsNumber()
    order: number;

    @ApiProperty({ description: 'The type of gallery image.', example: 'showcase' })
    @IsOptional()
    @IsString()
    type?: 'entity' | 'url';
}

class FontAuthorDto implements FontAuthor {
    @ApiProperty({ description: 'The name of the author.', example: 'John Doe' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ description: 'The URL for the author profile or portfolio.', example: 'https://johndoe.com' })
    @IsOptional()
    @IsString()
    url?: string;
}

export class CreateFontDto {
    @ApiProperty({ description: 'The name of the font.', example: 'Proxima Nova' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        description: 'A list of authors for the font.',
        type: [FontAuthorDto],
        example: [
            {
                name: 'Christian Robertson',
                url: 'https://example.com',
            },
        ],
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => FontAuthorDto)
    authors?: FontAuthorDto[];

    @ApiProperty({ description: 'The URL of the thumbnail image.', example: 'https://example.com/thumbnail.jpg' })
    @IsOptional()
    @IsString()
    thumbnailUrl?: string;

    @ApiProperty({
        description: 'A detailed description of the font.',
        example: 'A popular sans-serif font known for its clean and modern look.',
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        description: 'The UUID of the thumbnail file.',
        example: 'a1e581e2-3882-41d4-83b3-e5b1b4e3f3b1',
    })
    @IsOptional()
    @IsUUID()
    thumbnailFileId?: string;

    @ApiProperty({
        description: 'A list of gallery images for the font.',
        type: [FontGalleryImageDto],
        example: [
            {
                fileId: 'b7b5c6e8-34a0-4f51-8a19-1c19b9d4c7b8',
                url: 'https://example.com/image.jpg',
                order: 1,
                type: 'entity',
            },
        ],
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => FontGalleryImageDto)
    galleryImages?: FontGalleryImageDto[];

    @ApiProperty({ description: 'The UUID of the font creator.', example: 'c3a70b02-5f3b-4a62-b0d8-f7d3c6f5a5d3' })
    @IsUUID()
    creatorId: string;

    @ApiProperty({ enum: FONT_TYPE, default: FONT_TYPE.FREE, example: FONT_TYPE.VIP })
    @IsOptional()
    @IsEnum(FONT_TYPE)
    fontType?: FontType = FONT_TYPE.FREE;

    @ApiProperty({ description: 'The price of the font if it is premium.', example: 29.99 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number = 0;

    @ApiProperty({ description: 'Whether the font is active and available for use.', example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean = true;

    @ApiProperty({
        description: 'Additional metadata for the font.',
        example: { version: '2.0', foundary: 'FontFabric' },
    })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;

    @ApiProperty({
        description: 'An array of category UUIDs to associate with the font.',
        example: ['d4f7b3c2-1e9a-4b0e-9a7a-3e2c1b0d9f6e', 'e5a8c4d3-2f8b-4c1f-8b8a-4f3d2c1b0a9f'],
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @IsUUID('all', { each: true })
    categoryIds?: string[];

    @ApiProperty({
        description: 'An array of tag UUIDs (for existing tags) or names (for new tags).',
        example: ['d4f7b3c2-1e9a-4b0e-9a7a-3e2c1b0d9f6e', 'New Modern Tag', 'Vintage'],
        type: [String],
    })
    @IsOptional()
    @IsUuidOrStringArray()
    tags?: string[];

    @ApiProperty({
        description: 'The preview text of the font.',
        example: 'The quick brown fox jumps over the lazy dog.',
        default: 'The quick brown fox jumps over the lazy dog.',
    })
    @IsOptional()
    @IsString()
    previewText?: string;
}
