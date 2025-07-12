import { Table, Column, Model, DataType, PrimaryKey } from 'sequelize-typescript';

@Table({
    tableName: 'nvn_font_search',
    timestamps: true,
    paranoid: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt',
})
export class FontSearch extends Model<FontSearch> {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        allowNull: false,
    })
    id: string;

    @Column(DataType.TEXT)
    name: string;

    @Column(DataType.TEXT)
    slug: string;

    @Column(DataType.JSONB)
    authors: object;

    @Column(DataType.TEXT)
    description: string;

    @Column({ type: DataType.TEXT, field: 'fontType' })
    fontType: string;

    @Column(DataType.DECIMAL(10, 2))
    price: number;

    @Column({ type: DataType.INTEGER, field: 'downloadCount' })
    downloadCount: number;

    @Column({ type: DataType.BOOLEAN, field: 'isActive' })
    isActive: boolean;

    @Column({ type: DataType.BOOLEAN, field: 'isSupportVietnamese' })
    isSupportVietnamese: boolean;

    @Column(DataType.JSONB)
    metadata: object;

    @Column({ type: DataType.DATE, field: 'createdAt' })
    createdAt: Date;

    @Column({ type: DataType.DATE, field: 'updatedAt' })
    updatedAt: Date;

    @Column({ type: DataType.TEXT, field: 'thumbnailUrl' })
    thumbnailUrl: string;

    @Column({ type: DataType.TEXT, field: 'previewText' })
    previewText: string;

    @Column({ type: DataType.JSONB, field: 'galleryImages' })
    galleryImages: object;

    @Column({ type: DataType.UUID, field: 'creatorId' })
    creatorId: string;

    @Column({ type: DataType.UUID, field: 'thumbnailFileId' })
    thumbnailFileId: string;

    @Column(DataType.JSONB)
    creator: object;

    @Column({ type: DataType.JSONB, field: 'thumbnailFile' })
    thumbnailFile: object;

    @Column(DataType.JSONB)
    categories: object;

    @Column(DataType.JSONB)
    tags: object;

    @Column(DataType.JSONB)
    weights: object;

    @Column({ type: DataType.BIGINT, field: 'weightCount' })
    weightCount: number;

    @Column({ type: DataType.ARRAY(DataType.UUID), field: 'categoryIds' })
    categoryIds: string[];

    @Column({ type: DataType.ARRAY(DataType.UUID), field: 'tagIds' })
    tagIds: string[];

    @Column({ type: DataType.ARRAY(DataType.UUID), field: 'weightIds' })
    weightIds: string[];

    @Column(DataType.TSVECTOR)
    document: any;

    @Column({ type: DataType.DATE, field: 'deletedAt' })
    deletedAt: Date;

    @Column({ type: DataType.DATE, field: 'last_updated' })
    lastUpdated: Date;
}
