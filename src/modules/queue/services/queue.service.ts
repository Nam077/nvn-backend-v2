import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import { get } from 'lodash';
import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';

import { FontUpdateQueue } from '../entities/font-update-queue.entity';

@Injectable()
export class QueueService {
    private readonly logger = new Logger(QueueService.name);

    constructor(
        @InjectModel(FontUpdateQueue)
        private readonly fontUpdateQueueModel: typeof FontUpdateQueue,
        private readonly sequelize: Sequelize,
    ) {}

    async getQueueHealth(): Promise<any> {
        this.logger.log('Fetching queue health from database...');
        try {
            const result = await this.sequelize.query('SELECT nvn_get_queue_health() as health;', {
                type: QueryTypes.SELECT,
                plain: true,
            });
            return get(result, 'health', {});
        } catch (error) {
            this.logger.error('Failed to fetch queue health', get(error, 'stack', 'Unknown error'));
            throw error;
        }
    }

    async queueFullResync(): Promise<{ message: string; taskId: string }> {
        this.logger.log('Queueing a full font synchronization task via entity...');
        try {
            const task = await this.fontUpdateQueueModel.create({
                taskType: 'FULL_RESYNC',
                priority: 5,
                createdBy: 'manual_sync_trigger',
            });

            this.logger.log(`Full sync task queued successfully. Task ID: ${task.id}`);
            return {
                message: 'Full font synchronization task has been successfully queued.',
                taskId: task.id,
            };
        } catch (error) {
            this.logger.error('Failed to queue full sync task', get(error, 'stack', 'Unknown error'));
            throw error;
        }
    }
}
