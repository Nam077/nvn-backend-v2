import { ApiProperty } from '@nestjs/swagger';

import { size, values } from 'lodash';
import {
    BelongsTo,
    BelongsToMany,
    Column,
    CreatedAt,
    DataType,
    DeletedAt,
    ForeignKey,
    HasMany,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt,
} from 'sequelize-typescript';

import { Category } from '@/modules/categories/entities/category.entity';
import { CollectionCategory } from '@/modules/collections/entities/collection-category.entity';
import { CollectionFont } from '@/modules/collections/entities/collection-font.entity';
import { User } from '@/modules/users/entities/user.entity';

export const COLLECTION_TYPE = {
    FREE: 'free',
    VIP: 'vip',
    PAID: 'paid',
} as const;

export type CollectionType = (typeof COLLECTION_TYPE)[keyof typeof COLLECTION_TYPE];

@Table({
    tableName: 'nvn_collections',
    timestamps: true,
    paranoid: true,
})
export class FontCollection extends Model<FontCollection, FontCollectionCreationAttrs> {
    @ApiProperty({ description: 'Collection ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        field: 'id',
    })
    declare id: string;

    @ApiProperty({ description: 'Collection name', example: 'Wedding Font Pack' })
    @Column({
        type: DataType.STRING,
        allowNull: false,
        field: 'name',
    })
    declare name: string;

    @ApiProperty({ description: 'Collection slug', example: 'wedding-font-pack' })
    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
        field: 'slug',
    })
    declare slug: string;

    @ApiProperty({ description: 'Collection description', example: 'Beautiful fonts for wedding invitations' })
    @Column({
        type: DataType.TEXT,
        allowNull: true,
        field: 'description',
    })
    declare description: string;

    @ApiProperty({ description: 'Cover image URL', example: '/covers/wedding-pack-cover.jpg' })
    @Column({
        type: DataType.STRING,
        allowNull: true,
        field: 'coverImageUrl',
    })
    declare coverImageUrl: string;

    @ApiProperty({ description: 'Creator ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ForeignKey(() => User)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'creatorId',
    })
    declare creatorId: string;

    @ApiProperty({
        description: 'Collection type',
        example: 'paid',
        enum: values(COLLECTION_TYPE),
    })
    @Column({
        type: DataType.ENUM(...values(COLLECTION_TYPE)),
        allowNull: false,
        defaultValue: COLLECTION_TYPE.FREE,
        field: 'collectionType',
    })
    declare collectionType: CollectionType;

    @ApiProperty({ description: 'Price in VND', example: 250000 })
    @Column({
        type: DataType.DECIMAL(10, 2),
        defaultValue: 0,
        field: 'price',
    })
    declare price: number;

    @ApiProperty({ description: 'Total download count', example: 485 })
    @Column({
        type: DataType.INTEGER,
        defaultValue: 0,
        field: 'downloadCount',
    })
    declare downloadCount: number;

    @ApiProperty({ description: 'Is collection active', example: true })
    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
        field: 'isActive',
    })
    declare isActive: boolean;

    @ApiProperty({ description: 'Additional metadata', example: '{"theme": "wedding", "style": "elegant"}' })
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

    @DeletedAt
    @Column({ field: 'deletedAt' })
    declare deletedAt: Date;

    // Associations
    @BelongsTo(() => User)
    declare creator: User;

    @BelongsToMany(() => Category, () => CollectionCategory)
    declare categories: Category[];

    @HasMany(() => CollectionFont)
    declare collectionFonts: CollectionFont[];

    // Virtual properties
    @ApiProperty({ description: 'Is collection free', example: false })
    get isFree(): boolean {
        return this.collectionType === COLLECTION_TYPE.FREE;
    }

    @ApiProperty({ description: 'Is collection VIP only', example: false })
    get isVip(): boolean {
        return this.collectionType === COLLECTION_TYPE.VIP;
    }

    @ApiProperty({ description: 'Is collection paid', example: true })
    get isPaid(): boolean {
        return this.collectionType === COLLECTION_TYPE.PAID;
    }

    @ApiProperty({ description: 'Number of fonts in collection', example: 12 })
    get fontCount(): number {
        return size(this.collectionFonts) || 0;
    }

    @ApiProperty({ description: 'Average price per font', example: 20833 })
    get averagePricePerFont(): number {
        if (this.fontCount === 0) return 0;
        return Math.round(this.price / this.fontCount);
    }
}

export interface FontCollectionCreationAttrs {
    name: string;
    slug: string;
    description?: string;
    coverImageUrl?: string;
    creatorId: string;
    collectionType?: CollectionType;
    price?: number;
    isActive?: boolean;
    metadata?: Record<string, any>;
}
