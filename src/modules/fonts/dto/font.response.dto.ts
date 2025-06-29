import { ApiProperty } from '@nestjs/swagger';

import { Exclude, Expose, Type, plainToInstance } from 'class-transformer';
import { assign } from 'lodash';

import { CategoryResponseDto } from '@/modules/categories/dto/category.response.dto';
import { File } from '@/modules/files/entities/file.entity';
import { TagResponseDto } from '@/modules/tags/dto/tag.response.dto';
import { UserResponseDto } from '@/modules/users/dto/user.response.dto';

import { FontAuthor, FontGalleryImage, FontType, FONT_TYPE, Font } from '../entities/font.entity';

@Exclude()
export class FileResponseDto {
    @Expose()
    @ApiProperty({ description: 'File ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    id: string;

    @Expose()
    @ApiProperty({ description: 'File URL', example: '/files/roboto-thumb.png' })
    url: string;

    constructor(partial: Partial<File>) {
        assign(this, plainToInstance(FileResponseDto, partial, { excludeExtraneousValues: true }));
    }
}

@Exclude()
export class WeightResponseDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    name: string;

    @Expose()
    @ApiProperty()
    weight: number;

    constructor(partial: any) {
        assign(this, plainToInstance(WeightResponseDto, partial, { excludeExtraneousValues: true }));
    }
}

@Exclude()
export class FontResponseDto {
    @Expose()
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
    id: string;

    @Expose()
    @ApiProperty({ example: 'Roboto' })
    name: string;

    @Expose()
    @ApiProperty({ example: 'roboto' })
    slug: string;

    @Expose()
    @ApiProperty({
        description: 'Authors of the font',
        example: '[{"name": "Christian Robertson", "url": "https://example.com"}]',
        type: 'array',
        items: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                url: { type: 'string' },
            },
        },
    })
    authors: FontAuthor[];

    @Expose()
    @ApiProperty({ example: 'A modern sans-serif font.' })
    description: string;

    @Expose()
    @ApiProperty({ example: 'The quick brown fox jumps over the lazy dog.' })
    previewText: string;

    @Expose()
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
    thumbnailFileId: string;

    @Expose()
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002' })
    previewImageFileId: string;

    @Expose()
    @ApiProperty({ example: [] })
    galleryImages: FontGalleryImage[];

    @Expose()
    @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174003' })
    creatorId: string;

    @Expose()
    @ApiProperty({ enum: FONT_TYPE, example: 'free' })
    fontType: FontType;

    @Expose()
    @ApiProperty({ example: 0 })
    price: number;

    @Expose()
    @ApiProperty({ example: 1500 })
    downloadCount: number;

    @Expose()
    @ApiProperty({ example: true })
    isActive: boolean;

    @Expose()
    @ApiProperty({ example: { license: 'OFL', version: '2.1' } })
    metadata: Record<string, any>;

    @Expose()
    @ApiProperty({ example: '2023-10-28T10:00:00.000Z' })
    createdAt: Date;

    @Expose()
    @ApiProperty({ example: '2023-10-28T12:00:00.000Z' })
    updatedAt: Date;

    @Expose()
    @ApiProperty({ example: true })
    isFree: boolean;

    @Expose()
    @ApiProperty({ example: false })
    isVip: boolean;

    @Expose()
    @ApiProperty({ example: false })
    isPaid: boolean;

    @Expose()
    @ApiProperty({ example: 9 })
    weightCount: number;

    @Expose()
    @ApiProperty({ example: 4 })
    galleryImageCount: number;

    @Expose()
    @ApiProperty({ example: '/files/roboto-thumb.png' })
    thumbnailUrl: string;

    @Expose()
    @ApiProperty({ example: '/files/roboto-preview.png' })
    previewImageUrl: string;

    // Relations
    @Expose()
    @ApiProperty({ type: () => UserResponseDto, required: false })
    @Type(() => UserResponseDto)
    creator?: UserResponseDto;

    @Expose()
    @ApiProperty({ type: () => [WeightResponseDto], required: false })
    @Type(() => WeightResponseDto)
    weights?: WeightResponseDto[];

    @Expose()
    @ApiProperty({ type: () => [CategoryResponseDto], required: false })
    @Type(() => CategoryResponseDto)
    categories?: CategoryResponseDto[];

    @Expose()
    @ApiProperty({ type: () => [TagResponseDto], required: false })
    @Type(() => TagResponseDto)
    tags?: TagResponseDto[];

    @Expose()
    @ApiProperty({ type: () => FileResponseDto, required: false })
    @Type(() => FileResponseDto)
    thumbnailFile?: FileResponseDto;

    @Expose()
    @ApiProperty({ type: () => FileResponseDto, required: false })
    @Type(() => FileResponseDto)
    previewImageFile?: FileResponseDto;

    constructor(font: Font) {
        assign(this, plainToInstance(FontResponseDto, font, { excludeExtraneousValues: true }));
    }
}
