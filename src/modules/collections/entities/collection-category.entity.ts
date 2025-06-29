import { ApiProperty } from '@nestjs/swagger';

import { BelongsTo, Column, CreatedAt, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';

import { Category } from '@/modules/categories/entities/category.entity';
import { FontCollection } from '@/modules/collections/entities/collection.entity';

@Table({
    tableName: 'collection_categories',
    timestamps: true,
    updatedAt: false,
})
export class CollectionCategory extends Model<CollectionCategory, CollectionCategoryCreationAttrs> {
    @ApiProperty({ description: 'Collection ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ForeignKey(() => FontCollection)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        primaryKey: true,
        field: 'collectionId',
    })
    declare collectionId: string;

    @ApiProperty({ description: 'Category ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ForeignKey(() => Category)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        primaryKey: true,
        field: 'categoryId',
    })
    declare categoryId: string;

    @ApiProperty({ description: 'Is primary category for this collection', example: true })
    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
        field: 'isPrimary',
    })
    declare isPrimary: boolean;

    @ApiProperty({ description: 'Creation date' })
    @CreatedAt
    @Column({ field: 'createdAt' })
    declare createdAt: Date;

    // Associations
    @BelongsTo(() => FontCollection)
    declare collection: FontCollection;

    @BelongsTo(() => Category)
    declare category: Category;
}

export interface CollectionCategoryCreationAttrs {
    collectionId: string;
    categoryId: string;
    isPrimary?: boolean;
}
