import { ApiProperty } from '@nestjs/swagger';

import { get, orderBy, size, values } from 'lodash';
import {
    BelongsTo,
    BelongsToMany,
    Column,
    CreatedAt,
    DataType,
    ForeignKey,
    HasMany,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt,
} from 'sequelize-typescript';

import { Category } from '@/modules/categories/entities/category.entity';
import { CollectionFont } from '@/modules/collections/entities/collection-font.entity';
import { File } from '@/modules/files/entities/file.entity';
import { FontCategory } from '@/modules/fonts/entities/font-category.entity';
import { FontTag } from '@/modules/fonts/entities/font-tag.entity';
import { FontWeight } from '@/modules/fonts/entities/font-weight.entity';
import { Tag } from '@/modules/tags/entities/tag.entity';
import { User } from '@/modules/users/entities/user.entity';

export const FONT_TYPE = {
    FREE: 'free',
    VIP: 'vip',
    PAID: 'paid',
} as const;

export type FontType = (typeof FONT_TYPE)[keyof typeof FONT_TYPE];

export interface FontAuthor {
    name: string;
    url?: string;
}

export interface FontGalleryImage {
    fileId: string;
    caption?: string;
    order: number;
    type?: 'preview' | 'showcase' | 'comparison';
}

@Table({
    tableName: 'fonts',
})
export class Font extends Model<Font, FontCreationAttrs> {
    @ApiProperty({ description: 'Font ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        field: 'id',
    })
    declare id: string;

    @ApiProperty({ description: 'Font name', example: 'Roboto' })
    @Column({
        type: DataType.STRING,
        allowNull: false,
        field: 'name',
    })
    declare name: string;

    @ApiProperty({ description: 'Font slug', example: 'roboto' })
    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
        field: 'slug',
    })
    declare slug: string;

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
    @Column({
        type: DataType.JSONB,
        defaultValue: [],
        field: 'authors',
    })
    declare authors: FontAuthor[];

    @ApiProperty({ description: 'Font description', example: 'Modern sans-serif font family' })
    @Column({
        type: DataType.TEXT,
        allowNull: true,
        field: 'description',
    })
    declare description: string;

    @ApiProperty({ description: 'Preview text', example: 'The quick brown fox jumps over the lazy dog' })
    @Column({
        type: DataType.STRING,
        defaultValue: 'The quick brown fox jumps over the lazy dog',
        field: 'previewText',
    })
    declare previewText: string;

    @ApiProperty({ description: 'Thumbnail file ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ForeignKey(() => File)
    @Column({
        type: DataType.UUID,
        allowNull: true,
        field: 'thumbnailFileId',
    })
    declare thumbnailFileId: string;

    @ApiProperty({ description: 'Preview image file ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ForeignKey(() => File)
    @Column({
        type: DataType.UUID,
        allowNull: true,
        field: 'previewImageFileId',
    })
    declare previewImageFileId: string;

    @ApiProperty({
        description: 'Gallery image file IDs with metadata',
        example: '[{"fileId": "uuid-1", "caption": "Regular weight preview", "order": 1, "type": "showcase"}]',
    })
    @Column({
        type: DataType.JSONB,
        defaultValue: [],
        field: 'galleryImages',
    })
    declare galleryImages: FontGalleryImage[];

    @ApiProperty({ description: 'Creator ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ForeignKey(() => User)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'creatorId',
    })
    declare creatorId: string;

    @ApiProperty({
        description: 'Font type',
        example: 'free',
        enum: values(FONT_TYPE),
    })
    @Column({
        type: DataType.ENUM(...values(FONT_TYPE)),
        allowNull: false,
        defaultValue: FONT_TYPE.FREE,
        field: 'fontType',
    })
    declare fontType: FontType;

    @ApiProperty({ description: 'Price in VND', example: 50000 })
    @Column({
        type: DataType.DECIMAL(10, 2),
        defaultValue: 0,
        field: 'price',
    })
    declare price: number;

    @ApiProperty({ description: 'Total download count', example: 1250 })
    @Column({
        type: DataType.INTEGER,
        defaultValue: 0,
        field: 'downloadCount',
    })
    declare downloadCount: number;

    @ApiProperty({ description: 'Is font active', example: true })
    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
        field: 'isActive',
    })
    declare isActive: boolean;

    @ApiProperty({ description: 'Additional metadata', example: '{"license": "OFL", "version": "2.0"}' })
    @Column({
        type: DataType.JSONB,
        defaultValue: {},
        field: 'metadata',
    })
    declare metadata: Record<string, any>;

    @ApiProperty({ description: 'Creation date' })
    @CreatedAt
    @Column({ field: 'createdAt' })
    declare createdAt: Date;

    @ApiProperty({ description: 'Last update date' })
    @UpdatedAt
    @Column({ field: 'updatedAt' })
    declare updatedAt: Date;

    // Associations
    @BelongsTo(() => User)
    declare creator: User;

    @HasMany(() => FontWeight)
    declare weights: FontWeight[];

    @BelongsToMany(() => Category, () => FontCategory)
    declare categories: Category[];

    @BelongsToMany(() => Tag, () => FontTag)
    declare tags: Tag[];

    @HasMany(() => CollectionFont)
    declare collectionFonts: CollectionFont[];

    @BelongsTo(() => File, 'thumbnailFileId')
    declare thumbnailFile: File;

    @BelongsTo(() => File, 'previewImageFileId')
    declare previewImageFile: File;

    // Virtual properties
    @ApiProperty({ description: 'Is font free', example: true })
    get isFree(): boolean {
        return this.fontType === FONT_TYPE.FREE;
    }

    @ApiProperty({ description: 'Is font VIP only', example: false })
    get isVip(): boolean {
        return this.fontType === FONT_TYPE.VIP;
    }

    @ApiProperty({ description: 'Is font paid', example: false })
    get isPaid(): boolean {
        return this.fontType === FONT_TYPE.PAID;
    }

    @ApiProperty({ description: 'Number of weights available', example: 6 })
    get weightCount(): number {
        return size(this.weights) || 0;
    }

    @ApiProperty({ description: 'Number of gallery images', example: 3 })
    get galleryImageCount(): number {
        return size(this.galleryImages) || 0;
    }

    @ApiProperty({ description: 'Ordered gallery images for display', example: [] })
    get sortedGalleryImages(): FontGalleryImage[] {
        return orderBy(this.galleryImages || [], ['order'], ['asc']);
    }

    @ApiProperty({ description: 'Has gallery images', example: true })
    get hasGallery(): boolean {
        return this.galleryImageCount > 0;
    }

    @ApiProperty({ description: 'Thumbnail URL', example: '/thumbnails/roboto-thumb.jpg' })
    get thumbnailUrl(): string {
        return get(this.thumbnailFile, 'bestUrl', '');
    }

    @ApiProperty({ description: 'Preview image URL', example: '/previews/roboto-preview.jpg' })
    get previewImageUrl(): string {
        return get(this.previewImageFile, 'bestUrl', '');
    }
}

export interface FontCreationAttrs {
    name: string;
    slug: string;
    description?: string;
    previewText?: string;
    thumbnailUrl?: string;
    previewImageUrl?: string;
    creatorId: string;
    fontType?: FontType;
    price?: number;
    isActive?: boolean;
    metadata?: Record<string, any>;
    authors?: FontAuthor[];
}
