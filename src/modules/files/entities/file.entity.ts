import { ApiProperty } from '@nestjs/swagger';

import { includes, values } from 'lodash';
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

import { User } from '@/modules/users/entities/user.entity';

export const FILE_TYPE = {
    // Font files
    FONT_FILE: 'font_file',
    FONT_THUMBNAIL: 'font_thumbnail',
    FONT_GALLERY: 'font_gallery',

    // Collection files
    COLLECTION_COVER: 'collection_cover',
    COLLECTION_ZIP: 'collection_zip',

    // General
    AVATAR: 'avatar',
    ICON: 'icon',
    DOCUMENT: 'document',
    OTHER: 'other',
} as const;

export type FileType = (typeof FILE_TYPE)[keyof typeof FILE_TYPE];

export const FILE_STATUS = {
    UPLOADING: 'uploading',
    READY: 'ready',
    PROCESSING: 'processing',
    ERROR: 'error',
    DELETED: 'deleted',
} as const;

export type FileStatus = (typeof FILE_STATUS)[keyof typeof FILE_STATUS];

@Table({
    tableName: 'nvn_files',
    timestamps: true,
    paranoid: true,
})
export class File extends Model<File, FileCreationAttrs> {
    @ApiProperty({ description: 'File ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
        field: 'id',
    })
    declare id: string;

    @ApiProperty({ description: 'Original filename', example: 'roboto-bold.woff2' })
    @Column({
        type: DataType.STRING,
        allowNull: false,
        field: 'originalName',
    })
    declare originalName: string;

    @ApiProperty({ description: 'Stored filename', example: '2024/01/uuid-roboto-bold.woff2' })
    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
        field: 'storedName',
    })
    declare storedName: string;

    @ApiProperty({ description: 'File URL', example: '/files/2024/01/uuid-roboto-bold.woff2' })
    @Column({
        type: DataType.STRING,
        allowNull: false,
        field: 'url',
    })
    declare url: string;

    @ApiProperty({ description: 'CDN URL', example: 'https://cdn.example.com/files/uuid-roboto-bold.woff2' })
    @Column({
        type: DataType.STRING,
        allowNull: true,
        field: 'cdnUrl',
    })
    declare cdnUrl: string;

    @ApiProperty({
        description: 'File type',
        example: 'font_file',
        enum: values(FILE_TYPE),
    })
    @Column({
        type: DataType.ENUM(...values(FILE_TYPE)),
        allowNull: false,
        field: 'fileType',
    })
    declare fileType: FileType;

    @ApiProperty({ description: 'MIME type', example: 'font/woff2' })
    @Column({
        type: DataType.STRING,
        allowNull: false,
        field: 'mimeType',
    })
    declare mimeType: string;

    @ApiProperty({ description: 'File extension', example: 'woff2' })
    @Column({
        type: DataType.STRING,
        allowNull: false,
        field: 'extension',
    })
    declare extension: string;

    @ApiProperty({ description: 'File size in bytes', example: 45820 })
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        field: 'fileSize',
    })
    declare fileSize: number;

    @ApiProperty({
        description: 'File status',
        example: 'ready',
        enum: values(FILE_STATUS),
    })
    @Column({
        type: DataType.ENUM(...values(FILE_STATUS)),
        allowNull: false,
        defaultValue: FILE_STATUS.UPLOADING,
        field: 'status',
    })
    declare status: FileStatus;

    @ApiProperty({ description: 'Upload path on storage', example: 's3://bucket/files/2024/01/uuid-file.ext' })
    @Column({
        type: DataType.STRING,
        allowNull: true,
        field: 'storagePath',
    })
    declare storagePath: string;

    @ApiProperty({ description: 'Storage provider', example: 's3' })
    @Column({
        type: DataType.STRING,
        defaultValue: 'local',
        field: 'storageProvider',
    })
    declare storageProvider: string;

    @ApiProperty({ description: 'File hash/checksum', example: 'sha256:abc123...' })
    @Column({
        type: DataType.STRING,
        allowNull: true,
        field: 'fileHash',
    })
    declare fileHash: string;

    @ApiProperty({ description: 'Uploader ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ForeignKey(() => User)
    @Column({
        type: DataType.UUID,
        allowNull: true,
        field: 'uploadedBy',
    })
    declare uploadedBy: string;

    @ApiProperty({ description: 'File metadata', example: '{"width": 800, "height": 600, "weight": 700}' })
    @Column({
        type: DataType.JSONB,
        defaultValue: {},
        field: 'metadata',
    })
    declare metadata: Record<string, any>;

    @ApiProperty({ description: 'Upload date' })
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
    declare uploader: User;

    // Virtual properties
    @ApiProperty({ description: 'Formatted file size', example: '44.7 KB' })
    get formattedFileSize(): string {
        if (!this.fileSize) return 'Unknown';

        let size = this.fileSize;
        let unit = 'B';

        if (size >= 1024) {
            size /= 1024;
            unit = 'KB';
        }
        if (size >= 1024) {
            size /= 1024;
            unit = 'MB';
        }
        if (size >= 1024) {
            size /= 1024;
            unit = 'GB';
        }

        return `${size.toFixed(1)} ${unit}`;
    }

    @ApiProperty({ description: 'Best available URL (CDN or regular)', example: 'https://cdn.example.com/file.ext' })
    get bestUrl(): string {
        return this.cdnUrl || this.url;
    }

    @ApiProperty({ description: 'Is file ready for use', example: true })
    get isReady(): boolean {
        return this.status === FILE_STATUS.READY;
    }

    @ApiProperty({ description: 'Is font file', example: true })
    get isFontFile(): boolean {
        return this.fileType === FILE_TYPE.FONT_FILE;
    }

    @ApiProperty({ description: 'Is image file', example: false })
    get isImage(): boolean {
        const imageTypes = [
            FILE_TYPE.FONT_THUMBNAIL,
            FILE_TYPE.FONT_GALLERY,
            FILE_TYPE.COLLECTION_COVER,
            FILE_TYPE.AVATAR,
            FILE_TYPE.ICON,
        ] as const;
        return includes(imageTypes, this.fileType);
    }

    @ApiProperty({ description: 'Is zip/archive file', example: false })
    get isArchive(): boolean {
        return this.fileType === FILE_TYPE.COLLECTION_ZIP || this.extension === 'zip';
    }

    @ApiProperty({ description: 'File age in days', example: 15 })
    get ageInDays(): number {
        const now = new Date();
        const diffTime = now.getTime() - this.createdAt.getTime();
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }
}

export interface FileCreationAttrs {
    originalName: string;
    storedName: string;
    url: string;
    cdnUrl?: string;
    fileType: FileType;
    mimeType: string;
    extension: string;
    fileSize: number;
    status?: FileStatus;
    storagePath?: string;
    storageProvider?: string;
    fileHash?: string;
    uploadedBy?: string;
    metadata?: Record<string, any>;
}
