import { ApiProperty } from '@nestjs/swagger';

import { Expose } from 'class-transformer';
import { filter, join, size, split } from 'lodash';
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

import { CollectionCategory } from '@/modules/collections/entities/collection-category.entity';
import { FontCollection } from '@/modules/collections/entities/collection.entity';
import { FontCategory } from '@/modules/fonts/entities/font-category.entity';
import { Font } from '@/modules/fonts/entities/font.entity';

@Table({
    tableName: 'categories',
})
export class Category extends Model<Category, CategoryCreationAttrs> {
    @ApiProperty({ description: 'Category ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        field: 'id',
    })
    declare id: string;

    @ApiProperty({ description: 'Category name', example: 'Sans-serif' })
    @Column({
        type: DataType.STRING,
        allowNull: false,
        field: 'name',
    })
    declare name: string;

    @ApiProperty({ description: 'Category slug', example: 'sans-serif' })
    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
        field: 'slug',
    })
    declare slug: string;

    @ApiProperty({ description: 'Category description', example: 'Fonts without serifs' })
    @Column({
        type: DataType.TEXT,
        allowNull: true,
        field: 'description',
    })
    declare description: string;

    @ApiProperty({ description: 'Icon URL', example: '/icons/sans-serif.svg' })
    @Column({
        type: DataType.STRING,
        allowNull: true,
        field: 'iconUrl',
    })
    declare iconUrl: string;

    @ApiProperty({ description: 'Parent category ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ForeignKey(() => Category)
    @Column({
        type: DataType.UUID,
        allowNull: true,
        field: 'parentId',
    })
    declare parentId: string;

    @ApiProperty({ description: 'Hierarchy level', example: 2 })
    @Column({
        type: DataType.INTEGER,
        defaultValue: 0,
        field: 'level',
    })
    declare level: number;

    @ApiProperty({ description: 'Materialized path', example: '/typography/sans-serif' })
    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
        field: 'path',
    })
    declare path: string;

    @ApiProperty({ description: 'Sort order', example: 1 })
    @Column({
        type: DataType.INTEGER,
        defaultValue: 0,
        field: 'sortOrder',
    })
    declare sortOrder: number;

    @ApiProperty({ description: 'Is category active', example: true })
    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
        field: 'isActive',
    })
    declare isActive: boolean;

    @ApiProperty({ description: 'Creation date' })
    @CreatedAt
    @Column({ field: 'createdAt' })
    declare createdAt: Date;

    @ApiProperty({ description: 'Last update date' })
    @UpdatedAt
    @Column({ field: 'updatedAt' })
    declare updatedAt: Date;

    // Associations
    @BelongsTo(() => Category, {
        as: 'parent',
    })
    declare parent: Category;

    @HasMany(() => Category, {
        as: 'children',
    })
    declare children: Category[];

    @BelongsToMany(() => Font, () => FontCategory)
    declare fonts: Font[];

    @BelongsToMany(() => FontCollection, () => CollectionCategory)
    declare collections: FontCollection[];

    // Virtual properties
    @ApiProperty({ description: 'Is root category', example: true })
    @Expose()
    get isRoot(): boolean {
        return !this.parentId;
    }

    @ApiProperty({ description: 'Has children categories', example: true })
    @Expose()
    get hasChildren(): boolean {
        return size(this.children) > 0;
    }

    @ApiProperty({ description: 'Category breadcrumb path', example: ['Typography', 'Sans-serif'] })
    @Expose()
    get breadcrumb(): string[] {
        return filter(split(this.path, '/'), Boolean);
    }

    @ApiProperty({ description: 'Number of direct children', example: 4 })
    @Expose()
    get childrenCount(): number {
        return size(this.children) || 0;
    }

    @ApiProperty({ description: 'Category display path', example: 'Typography > Sans-serif' })
    @Expose()
    get displayPath(): string {
        return join(this.breadcrumb, ' > ');
    }
}

export interface CategoryCreationAttrs {
    name: string;
    slug: string;
    description?: string;
    iconUrl?: string;
    parentId?: string;
    level?: number;
    path: string;
    sortOrder?: number;
    isActive?: boolean;
}
