import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { get } from 'lodash';
import { Client } from 'pg';
import { Sequelize } from 'sequelize-typescript';

import { ConfigServiceApp } from '../config/config.service';

// Type definitions
interface QueueProcessorResult {
    worker_id: string;
    tasks_processed: number;
    tasks_failed: number;
    fonts_upserted: number;
    fonts_deleted: number;
    processing_time_ms: number;
    timestamp: string;
}

interface QueueHealth {
    total_tasks: number;
    single_font_tasks: number;
    aggregate_tasks: number;
    processing_tasks: number;
    failed_tasks: number;
    dead_tasks: number;
    newest_task: string | null;
    oldest_task: string | null;
    total_estimated_fonts: number;
    avg_processing_time_ms: number;
    max_processing_time_ms: number;
    task_breakdown: Record<string, number>;
    health_status: 'healthy' | 'good' | 'busy' | 'overloaded' | 'critical';
    timestamp: string;
}

interface EmergencyResetResult {
    reset_tasks: number;
    timestamp: string;
}

interface ProcessorStats {
    totalRuns: number;
    totalTasksProcessed: number;
    totalFontsProcessed: number;
    totalErrors: number;
    lastRun: Date | null;
    lastError: string | null;
    avgProcessingTime: number;
    uptime: Date;
    uptimeSeconds: number;
    isProcessing: boolean;
    consecutiveErrors: number;
    healthStatus: 'healthy' | 'degraded';
}

interface DatabaseQueryResult<T = any> {
    [key: string]: T;
}

@Injectable()
export class TasksService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(TasksService.name);
    private isProcessing: boolean = false;
    private consecutiveErrors: number = 0;
    private readonly maxConsecutiveErrors: number = 5;
    private listenerClient: Client;

    private stats: {
        totalRuns: number;
        totalTasksProcessed: number;
        totalFontsProcessed: number;
        totalErrors: number;
        lastRun: Date | null;
        lastError: string | null;
        avgProcessingTime: number;
        uptime: Date;
    } = {
        totalRuns: 0,
        totalTasksProcessed: 0,
        totalFontsProcessed: 0,
        totalErrors: 0,
        lastRun: null,
        lastError: null,
        avgProcessingTime: 0,
        uptime: new Date(),
    };

    constructor(
        private readonly sequelize: Sequelize,
        private readonly configService: ConfigServiceApp,
    ) {}

    async onModuleInit() {
        this.logger.log('TasksService initializing, cleaning up any stuck tasks from previous runs...');
        await this.cleanupFailedTasks();

        this.listenerClient = new Client({
            host: this.configService.dbHost,
            port: this.configService.dbPort,
            user: this.configService.dbUsername,
            password: this.configService.dbPassword,
            database: this.configService.dbName,
        });

        try {
            await this.listenerClient.connect();
            this.listenerClient.on('notification', () => {
                this.logger.debug('Received notification, triggering queue processor');
                void this.handleProcessFontQueue();
            });
            void this.listenerClient.query('LISTEN new_queue_task');

            this.logger.log('Database listener connected and listening for "new_queue_task"');
        } catch (error) {
            this.logger.error('Failed to connect database listener', error);
        }
    }

    async onModuleDestroy() {
        await this.listenerClient.end();
        this.logger.log('Database listener disconnected');
    }

    /**
     * Main queue processor - runs on notification
     */
    async handleProcessFontQueue(): Promise<void> {
        // Skip if already processing
        if (this.isProcessing) {
            this.logger.debug('Queue processor already running, skipping...');
            return;
        }

        // Backoff on consecutive errors
        if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
            this.logger.warn(`Too many consecutive errors (${this.consecutiveErrors}), backing off...`);
            return;
        }

        this.isProcessing = true;
        const startTime: number = Date.now();

        try {
            this.logger.debug('Starting font queue processing...');

            const [result] = (await this.sequelize.query('SELECT run_queue_processor();')) as [
                DatabaseQueryResult[],
                unknown,
            ];
            const stats: QueueProcessorResult | undefined = get(
                result,
                '[0].run_queue_processor',
            ) as QueueProcessorResult;

            if (stats) {
                this.updateStats(stats, Date.now() - startTime);

                const tasksProcessed: number = get(stats, 'tasks_processed', 0);
                if (tasksProcessed > 0) {
                    const fontsUpserted: number = get(stats, 'fonts_upserted', 0);
                    const fontsDeleted: number = get(stats, 'fonts_deleted', 0);
                    const processingTimeMs: number = get(stats, 'processing_time_ms', 0);

                    this.logger.log(
                        `✅ Processed ${tasksProcessed} tasks ` +
                            `(${fontsUpserted} upserted, ${fontsDeleted} deleted) ` +
                            `in ${processingTimeMs}ms`,
                    );

                    const tasksFailed: number = get(stats, 'tasks_failed', 0);
                    if (tasksFailed > 0) {
                        this.logger.warn(`⚠️ ${tasksFailed} tasks failed and will be retried`);
                    }
                }
            }

            // Reset consecutive errors on success
            this.consecutiveErrors = 0;
        } catch (error: unknown) {
            this.consecutiveErrors++;
            this.stats.totalErrors++;
            this.stats.lastError = get(error, 'message', 'Unknown error') as string;

            this.logger.error(
                `❌ Font queue processor error (${this.consecutiveErrors}/${this.maxConsecutiveErrors}):`,
                {
                    error: get(error, 'message') as string,
                    stack: get(error, 'stack') as string,
                    consecutiveErrors: this.consecutiveErrors,
                },
            );

            // Emergency reset if too many errors
            if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
                this.logger.error('🆘 Triggering emergency queue reset...');
                await this.emergencyReset();
            }
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Health monitoring and cleanup - runs every minute
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async handleHealthMonitoring(): Promise<void> {
        try {
            const [healthResult] = (await this.sequelize.query('SELECT get_queue_health();')) as [
                DatabaseQueryResult[],
                unknown,
            ];
            const health: QueueHealth | undefined = get(healthResult, '[0].get_queue_health') as QueueHealth;

            if (!health) return;

            const healthStatus: string = get(health, 'health_status', 'unknown') as string;
            const totalTasks: number = get(health, 'total_tasks', 0);

            this.logger.log(`💊 Queue Health: ${healthStatus} (${totalTasks} tasks)`);

            // Log detailed health if not healthy
            if (healthStatus !== 'healthy') {
                const aggregateTasks: number = get(health, 'aggregate_tasks', 0);
                const failedTasks: number = get(health, 'failed_tasks', 0);
                const deadTasks: number = get(health, 'dead_tasks', 0);
                const estimatedFonts: number = get(health, 'total_estimated_fonts', 0);

                this.logger.warn('Queue Health Details:', {
                    status: healthStatus,
                    totalTasks,
                    aggregateTasks,
                    failedTasks,
                    deadTasks,
                    estimatedFonts,
                });
            }

            // Auto-cleanup if needed
            const failedTasks: number = get(health, 'failed_tasks', 0);
            const deadTasks: number = get(health, 'dead_tasks', 0);

            if (failedTasks > 50 || deadTasks > 10) {
                this.logger.log('🧹 Auto-triggering cleanup due to high failure count...');
                await this.cleanupFailedTasks();
            }
        } catch (error: unknown) {
            this.logger.error('Health monitoring error:', get(error, 'message') as string);
        }
    }

    /**
     * Cleanup failed tasks every 30 minutes
     */
    @Cron(CronExpression.EVERY_30_MINUTES)
    async handleCleanup(): Promise<void> {
        await this.cleanupFailedTasks();
    }

    /**
     * System stats logging every 5 minutes
     */
    @Cron('0 */5 * * * *')
    logSystemStats(): void {
        const uptime: number = Math.round((Date.now() - this.stats.uptime.getTime()) / 1000);

        this.logger.log('📊 Font Queue Processor Stats:', {
            ...this.stats,
            uptimeSeconds: uptime,
            isProcessing: this.isProcessing,
            consecutiveErrors: this.consecutiveErrors,
        });
    }

    private async cleanupFailedTasks(): Promise<number> {
        try {
            const [result] = (await this.sequelize.query('SELECT cleanup_failed_tasks();')) as [
                DatabaseQueryResult[],
                unknown,
            ];
            const cleaned: number = get(result, '[0].cleanup_failed_tasks', 0) as number;

            if (cleaned > 0) {
                this.logger.log(`🧹 Cleanup completed: ${cleaned} failed/stuck tasks handled`);
            }

            return cleaned;
        } catch (error: unknown) {
            this.logger.error('Cleanup error:', get(error, 'message') as string);
            return 0;
        }
    }

    /**
     * Emergency reset of stuck processing tasks
     */
    private async emergencyReset(): Promise<void> {
        try {
            const [result] = (await this.sequelize.query('SELECT emergency_queue_reset();')) as [
                DatabaseQueryResult[],
                unknown,
            ];
            const resetResult: EmergencyResetResult | undefined = get(
                result,
                '[0].emergency_queue_reset',
            ) as EmergencyResetResult;

            this.logger.warn('🔧 Emergency reset completed:', resetResult);
            this.consecutiveErrors = 0; // Reset counter after emergency reset
        } catch (error: unknown) {
            this.logger.error('Emergency reset failed:', get(error, 'message') as string);
        }
    }

    private updateStats(result: QueueProcessorResult, processingTime: number): void {
        this.stats.totalRuns++;
        this.stats.totalTasksProcessed += get(result, 'tasks_processed', 0);

        const fontsUpserted: number = get(result, 'fonts_upserted', 0);
        const fontsDeleted: number = get(result, 'fonts_deleted', 0);
        this.stats.totalFontsProcessed += fontsUpserted + fontsDeleted;

        this.stats.lastRun = new Date();

        const tasksProcessed: number = get(result, 'tasks_processed', 0);
        if (tasksProcessed > 0) {
            this.stats.avgProcessingTime = Math.round((this.stats.avgProcessingTime + processingTime) / 2);
        }
    }

    // Public API methods

    async getQueueHealth(): Promise<QueueHealth | null> {
        try {
            const [result] = (await this.sequelize.query('SELECT get_queue_health();')) as [
                DatabaseQueryResult[],
                unknown,
            ];
            return get(result, '[0].get_queue_health') as QueueHealth;
        } catch (error: unknown) {
            this.logger.error('Get queue health error:', get(error, 'message') as string);
            return null;
        }
    }

    getProcessorStats(): ProcessorStats {
        const uptime: number = Math.round((Date.now() - this.stats.uptime.getTime()) / 1000);

        return {
            ...this.stats,
            uptimeSeconds: uptime,
            isProcessing: this.isProcessing,
            consecutiveErrors: this.consecutiveErrors,
            healthStatus: this.consecutiveErrors >= this.maxConsecutiveErrors ? 'degraded' : 'healthy',
        };
    }

    async forceProcessQueue(batchSize: number = 200): Promise<QueueProcessorResult> {
        if (this.isProcessing) {
            throw new Error('Queue processor is already running');
        }

        try {
            this.logger.log(`🔧 Manual queue processing triggered (batch size: ${batchSize})`);

            const [result] = (await this.sequelize.query(
                `SELECT process_font_update_queue_enhanced(${batchSize});`,
            )) as [DatabaseQueryResult[], unknown];

            const stats: QueueProcessorResult = get(
                result,
                '[0].process_font_update_queue_enhanced',
            ) as QueueProcessorResult;
            this.updateStats(stats, 0);

            return stats;
        } catch (error: unknown) {
            this.logger.error('Manual queue processing error:', get(error, 'message') as string);
            throw error;
        }
    }

    async forceCleanup(): Promise<number> {
        this.logger.log('🔧 Manual cleanup triggered');
        return await this.cleanupFailedTasks();
    }

    /**
     * Manually trigger emergency reset
     */
    async forceEmergencyReset(): Promise<void> {
        this.logger.warn('🆘 Manual emergency reset triggered');
        await this.emergencyReset();
    }
}
