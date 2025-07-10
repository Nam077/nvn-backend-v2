import { ApiProperty } from '@nestjs/swagger';

import { Table, Column, Model, ForeignKey, PrimaryKey, DataType, BelongsTo } from 'sequelize-typescript';

import { Category } from '@/modules/categories/entities/category.entity';

import { Font } from './font.entity';

@Table({
    tableName: 'nvn_font_categories',
    timestamps: true,
})
export class FontCategory extends Model<FontCategory> {
    @ApiProperty({ description: 'Font ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @PrimaryKey
    @ForeignKey(() => Font)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        primaryKey: true,
        field: 'fontId',
    })
    declare fontId: string;

    @ApiProperty({ description: 'Category ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @PrimaryKey
    @ForeignKey(() => Category)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        primaryKey: true,
        field: 'categoryId',
    })
    declare categoryId: string;

    @ApiProperty({ description: 'Is primary category for this font', example: true })
    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
        field: 'isPrimary',
    })
    declare isPrimary: boolean;

    // Associations
    @BelongsTo(() => Font)
    declare font: Font;

    @BelongsTo(() => Category)
    declare category: Category;
}

export interface FontCategoryCreationAttrs {
    fontId: string;
    categoryId: string;
    isPrimary?: boolean;
}
