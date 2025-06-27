import { ApiProperty } from '@nestjs/swagger';

import { BelongsTo, Column, CreatedAt, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';

import { FontCollection } from '@/modules/collections/entities/collection.entity';
import { Font } from '@/modules/fonts/entities/font.entity';

@Table({
    tableName: 'collection_fonts',
    underscored: true,
    timestamps: true,
    updatedAt: false,
})
export class CollectionFont extends Model<CollectionFont, CollectionFontCreationAttrs> {
    @ApiProperty({ description: 'Collection ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ForeignKey(() => FontCollection)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        primaryKey: true,
    })
    declare collectionId: string;

    @ApiProperty({ description: 'Font ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ForeignKey(() => Font)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        primaryKey: true,
    })
    declare fontId: string;

    @ApiProperty({ description: 'Sort order within collection', example: 1 })
    @Column({
        type: DataType.INTEGER,
        defaultValue: 0,
    })
    declare sortOrder: number;

    @ApiProperty({ description: 'Date font was added to collection' })
    @CreatedAt
    declare addedAt: Date;

    // Associations
    @BelongsTo(() => FontCollection)
    declare collection: FontCollection;

    @BelongsTo(() => Font)
    declare font: Font;
}

export interface CollectionFontCreationAttrs {
    collectionId: string;
    fontId: string;
    sortOrder?: number;
}
