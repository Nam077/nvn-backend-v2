import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/sequelize';

import { chunk, get, map } from 'lodash';
import { Sequelize } from 'sequelize-typescript';

import { Font } from '@/modules/fonts/entities/font.entity';

const UPSERT_FUNCTION = 'upsert_font_search_index';
const BATCH_SIZE = 500; // Process 500 fonts at a time

@Injectable()
export class FontIntegrityService {
    private readonly logger = new Logger(FontIntegrityService.name);
    private isJobRunning = false;

    constructor(
        private readonly sequelize: Sequelize,
        @InjectModel(Font) private readonly fontModel: typeof Font,
    ) {}

    /**
     * Periodically re-synchronizes all active fonts with the search index.
     * This ensures data consistency and acts as a robust safeguard,
     * overriding any potential discrepancies without complex diffing logic.
     */
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
        name: 'fullSyncFontSearchIndex',
    })
    handleCron(): void {
        this.logger.log('CRON job `fullSyncFontSearchIndex` triggered.');
        void this.runFullSynchronization();
    }

    /**
     * The main logic for running the full synchronization.
     * Can be called by the cron job or manually via an endpoint.
     */
    async runFullSynchronization(): Promise<void> {
        if (this.isJobRunning) {
            this.logger.warn('Full synchronization job is already in progress. Skipping this run.');
            // Optionally, throw a ConflictException if this is triggered by a user
            return;
        }

        this.logger.log('🚀 Starting full font search index synchronization...');
        this.isJobRunning = true;

        try {
            const allActiveFontIds = await this.findAllActiveFontIds();

            if (allActiveFontIds.length === 0) {
                this.logger.log('✨ No active fonts found to synchronize.');
                return;
            }

            this.logger.log(
                `🔄 Found ${allActiveFontIds.length} active fonts. Re-synchronizing all of them in batches of ${BATCH_SIZE}...`,
            );
            await this.synchronizeFonts(allActiveFontIds);

            this.logger.log('✅ Full font synchronization completed successfully.');
        } catch (error: any) {
            this.logger.error('❌ An error occurred during the full synchronization:', get(error, 'stack'));
        } finally {
            this.isJobRunning = false;
        }
    }

    /**
     * Checks the current synchronization status by counting mismatched records.
     * @returns {Promise<{ isRunning: boolean; mismatchCount: number }>} The current status.
     */
    async getSyncStatus(): Promise<{ isRunning: boolean; mismatchCount: number }> {
        this.logger.log('Checking font search index synchronization status...');
        const [results] = await this.sequelize.query(`
            SELECT COUNT(f.id) as mismatch_count
            FROM fonts f
            LEFT JOIN font_search_index fsi ON f.id = fsi.id
            WHERE f."isActive" = true AND fsi.id IS NULL;
        `);

        const mismatchCount = parseInt(get(results, '[0].mismatch_count', '0'), 10);
        return {
            isRunning: this.isJobRunning,
            mismatchCount,
        };
    }

    /**
     * Fetches all active font IDs from the database.
     * @returns {Promise<string[]>} An array of all active font IDs.
     */
    private async findAllActiveFontIds(): Promise<string[]> {
        const results = await this.fontModel.findAll({
            where: { isActive: true },
            attributes: ['id'],
            raw: true,
        });
        return map(results, 'id');
    }

    /**
     * Synchronizes a list of font IDs by calling the PostgreSQL upsert function in batches.
     * @param {string[]} fontIds - An array of font IDs to synchronize.
     */
    private async synchronizeFonts(fontIds: string[]): Promise<void> {
        const batches = chunk(fontIds, BATCH_SIZE);
        let processedCount = 0;

        for (const batch of batches) {
            try {
                // IMPORTANT: Format the array of UUIDs into a PostgreSQL array literal string.
                const formattedIds = `{${batch.join(',')}}`;
                await this.sequelize.query(`SELECT ${UPSERT_FUNCTION}(:fontIds)`, {
                    replacements: { fontIds: formattedIds },
                    type: 'SELECT',
                });
                processedCount += batch.length;
                this.logger.log(`   Processed ${processedCount}/${fontIds.length} fonts...`);
            } catch (error: any) {
                this.logger.error(`Failed to process a batch starting with font ID ${batch[0]}`, get(error, 'stack'));
            }
        }
    }
}
