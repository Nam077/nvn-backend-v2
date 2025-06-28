import { ApiProperty } from '@nestjs/swagger';

import { Exclude, Expose } from 'class-transformer';

import { Font, FontGalleryImage, FontType, FONT_TYPE } from '../entities/font.entity';

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

    constructor(font: Font) {
        this.id = font.id;
        this.name = font.name;
        this.slug = font.slug;
        this.description = font.description;
        this.previewText = font.previewText;
        this.thumbnailFileId = font.thumbnailFileId;
        this.previewImageFileId = font.previewImageFileId;
        this.galleryImages = font.galleryImages;
        this.creatorId = font.creatorId;
        this.fontType = font.fontType;
        this.price = font.price;
        this.downloadCount = font.downloadCount;
        this.isActive = font.isActive;
        this.metadata = font.metadata;
        this.createdAt = font.createdAt;
        this.updatedAt = font.updatedAt;
        this.isFree = font.isFree;
        this.isVip = font.isVip;
        this.isPaid = font.isPaid;
        this.weightCount = font.weightCount;
        this.galleryImageCount = font.galleryImageCount;
        this.thumbnailUrl = font.thumbnailUrl;
        this.previewImageUrl = font.previewImageUrl;
    }
}
