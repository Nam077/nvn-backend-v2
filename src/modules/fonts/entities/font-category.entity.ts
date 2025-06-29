import { ApiProperty } from '@nestjs/swagger';

import { BelongsTo, Column, CreatedAt, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';

import { Category } from '@/modules/categories/entities/category.entity';

import { Font } from './font.entity';

@Table({
    tableName: 'font_categories',
    timestamps: true,
    updatedAt: false,
})
export class FontCategory extends Model<FontCategory, FontCategoryCreationAttrs> {
    @ApiProperty({ description: 'Font ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ForeignKey(() => Font)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        primaryKey: true,
        field: 'fontId',
    })
    declare fontId: string;

    @ApiProperty({ description: 'Category ID', example: '123e4567-e89b-12d3-a456-426614174000' })
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

    @ApiProperty({ description: 'Creation date' })
    @CreatedAt
    @Column({ field: 'createdAt' })
    declare createdAt: Date;

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
