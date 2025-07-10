import { ApiProperty } from '@nestjs/swagger';

import { get } from 'lodash';
import {
    BelongsTo,
    Column,
    CreatedAt,
    DataType,
    DeletedAt,
    ForeignKey,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt,
} from 'sequelize-typescript';

import { File } from '@/modules/files/entities/file.entity';
import { Font } from '@/modules/fonts/entities/font.entity';

@Table({
    tableName: 'nvn_font_weights',
    timestamps: true,
    paranoid: true,
})
export class FontWeight extends Model<FontWeight, FontWeightCreationAttrs> {
    @ApiProperty({ description: 'Weight ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        field: 'id',
    })
    declare id: string;

    @ApiProperty({ description: 'Font ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ForeignKey(() => Font)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'fontId',
    })
    declare fontId: string;

    @ApiProperty({ description: 'Weight name', example: 'Bold' })
    @Column({
        type: DataType.STRING,
        allowNull: false,
        field: 'weightName',
    })
    declare weightName: string;

    @ApiProperty({ description: 'Weight value', example: 700 })
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        field: 'weightValue',
    })
    declare weightValue: number;

    @ApiProperty({ description: 'Font file ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ForeignKey(() => File)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'fileId',
    })
    declare fileId: string;

    @ApiProperty({ description: 'Is weight active', example: true })
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

    @DeletedAt
    @Column({ field: 'deletedAt' })
    declare deletedAt: Date;

    // Associations
    @BelongsTo(() => Font)
    declare font: Font;

    @BelongsTo(() => File)
    declare file: File;

    // Virtual properties
    @ApiProperty({ description: 'Font file URL', example: '/fonts/roboto-bold.woff2' })
    get fileUrl(): string {
        return get(this.file, 'bestUrl', '');
    }

    @ApiProperty({ description: 'Formatted file size', example: '44.7 KB' })
    get formattedFileSize(): string {
        return get(this.file, 'formattedFileSize', 'Unknown');
    }

    @ApiProperty({ description: 'File format', example: 'woff2' })
    get fileFormat(): string {
        return get(this.file, 'extension', 'unknown');
    }

    @ApiProperty({ description: 'Is weight bold (700+)', example: true })
    get isBold(): boolean {
        return this.weightValue >= 700;
    }

    @ApiProperty({ description: 'Is weight light (300 or less)', example: false })
    get isLight(): boolean {
        return this.weightValue <= 300;
    }

    @ApiProperty({ description: 'Is weight regular (400)', example: false })
    get isRegular(): boolean {
        return this.weightValue === 400;
    }
}

export interface FontWeightCreationAttrs {
    fontId: string;
    weightName: string;
    weightValue: number;
    fileId: string;
    isActive?: boolean;
}
