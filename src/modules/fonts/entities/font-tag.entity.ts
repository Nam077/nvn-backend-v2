import { Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';

import { Font } from '@/modules/fonts/entities/font.entity';
import { Tag } from '@/modules/tags/entities/tag.entity';

@Table({
    tableName: 'font_tags',
    timestamps: false,
})
export class FontTag extends Model<FontTag> {
    @ForeignKey(() => Font)
    @Column({ type: DataType.UUID, field: 'fontId' })
    declare fontId: string;

    @ForeignKey(() => Tag)
    @Column({ type: DataType.UUID, field: 'tagId' })
    declare tagId: string;
}
