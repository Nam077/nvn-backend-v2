import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull } from 'sequelize-typescript';

@Table({
    tableName: 'nvn_font_update_queue',
    timestamps: false, // The table has its own timestamp management (queued_at, etc.)
})
export class FontUpdateQueue extends Model<FontUpdateQueue> {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    id: string;

    @AllowNull(false)
    @Column({ type: DataType.TEXT, field: 'task_type' })
    taskType: string;

    @Column({ type: DataType.UUID, field: 'font_id' })
    fontId: string;

    @Column({ type: DataType.UUID, field: 'target_id' })
    targetId: string;

    @AllowNull(false)
    @Default('upsert')
    @Column(DataType.TEXT)
    operation: string;

    @AllowNull(false)
    @Default(0)
    @Column(DataType.INTEGER)
    priority: number;

    @Default(1)
    @Column({ type: DataType.INTEGER, field: 'estimated_fonts' })
    estimatedFonts: number;

    @AllowNull(false)
    @Default(DataType.NOW)
    @Column({ type: DataType.DATE, field: 'queued_at' })
    queuedAt: Date;

    @AllowNull(false)
    @Default(false)
    @Column(DataType.BOOLEAN)
    processing: boolean;

    @Column({ type: DataType.DATE, field: 'started_at' })
    startedAt: Date;

    @Column({ type: DataType.DATE, field: 'completed_at' })
    completedAt: Date;

    @Column({ type: DataType.TEXT, field: 'worker_id' })
    workerId: string;

    @Column({ type: DataType.INTEGER, field: 'processing_time_ms' })
    processingTimeMs: number;

    @Default(0)
    @Column({ type: DataType.INTEGER, field: 'retry_count' })
    retryCount: number;

    @Default(3)
    @Column({ type: DataType.INTEGER, field: 'max_retries' })
    maxRetries: number;

    @Column({ type: DataType.TEXT, field: 'last_error' })
    lastError: string;

    @Column({ type: DataType.JSONB, field: 'error_details' })
    errorDetails: object;

    @Default({})
    @Column(DataType.JSONB)
    metadata: object;

    @Default('system')
    @Column({ type: DataType.TEXT, field: 'created_by' })
    createdBy: string;
}
