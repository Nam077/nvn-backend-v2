import { ApiProperty } from '@nestjs/swagger';

import { BelongsToMany, Column, CreatedAt, DataType, Model, PrimaryKey, Table, UpdatedAt } from 'sequelize-typescript';

import { FontTag } from '@/modules/fonts/entities/font-tag.entity';
import { Font } from '@/modules/fonts/entities/font.entity';

@Table({
    tableName: 'tags',
})
export class Tag extends Model<Tag, TagCreationAttrs> {
    @ApiProperty({ description: 'Tag ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        field: 'id',
    })
    declare id: string;

    @ApiProperty({ description: 'Tag name', example: 'Vintage' })
    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
        field: 'name',
    })
    declare name: string;

    @ApiProperty({ description: 'Tag slug', example: 'vintage' })
    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
        field: 'slug',
    })
    declare slug: string;

    @ApiProperty({ description: 'Tag description', example: 'Fonts with a retro, classic feel.' })
    @Column({
        type: DataType.TEXT,
        allowNull: true,
        field: 'description',
    })
    declare description: string;

    @ApiProperty({ description: 'Creation date' })
    @CreatedAt
    @Column({ field: 'createdAt' })
    declare createdAt: Date;

    @ApiProperty({ description: 'Last update date' })
    @UpdatedAt
    @Column({ field: 'updatedAt' })
    declare updatedAt: Date;

    // Associations
    @BelongsToMany(() => Font, () => FontTag)
    declare fonts: Font[];
}

export interface TagCreationAttrs {
    name: string;
    slug: string;
    description?: string;
}
