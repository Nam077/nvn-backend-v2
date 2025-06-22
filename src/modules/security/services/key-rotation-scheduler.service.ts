/* eslint-disable security/detect-object-injection */
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/sequelize';

import { get, map, filter, reduce, forEach, toUpper } from 'lodash';
import { Op, Transaction } from 'sequelize';

import { KeyManagerService } from './key-manager.service';
import { TOKEN_KEY_CONFIG, KEY_CONFIGURATIONS, DateHelper } from '../config/key.config';
import { KeyRotationHistory } from '../entities/key-rotation-history.entity';
import { SecurityKey } from '../entities/security-key.entity';
import { KeyType, KEY_STATUSES } from '../types/key.types';

@Injectable()
export class KeyRotationSchedulerService {
    private readonly logger = new Logger(KeyRotationSchedulerService.name);
    private readonly BATCH_SIZE = 10; // Process keys in batches
    private readonly MAX_PARALLEL_OPERATIONS = 5; // Limit concurrent operations

    constructor(
        @InjectModel(SecurityKey)
        private readonly securityKeyModel: typeof SecurityKey,
        @InjectModel(KeyRotationHistory)
        private readonly keyRotationHistoryModel: typeof KeyRotationHistory,
        private readonly keyManagerService: KeyManagerService,
    ) {}

    /**
     * Check for key rotation every day at midnight
     * Staggered from cleanup to avoid resource contention
     */
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async checkKeyRotation(): Promise<void> {
        this.logger.log('🔄 Starting scheduled key rotation check...');

        try {
            // Process all key types in parallel with controlled concurrency
            const keyTypeEntries = Object.entries(TOKEN_KEY_CONFIG);
            await this.processConcurrently(
                keyTypeEntries,
                async ([keyType, config]) => {
                    await this.rotateKeysIfNeeded(keyType as KeyType, config.rotationDays);
                },
                this.MAX_PARALLEL_OPERATIONS,
            );

            this.logger.log('✅ Scheduled key rotation check completed');
        } catch (error) {
            this.logger.error('❌ Error during scheduled key rotation:', error);
        }
    }

    /**
     * Cleanup expired keys (runs daily at 2 AM)
     * Staggered from rotation to avoid resource contention
     */
    @Cron('0 2 * * *') // 2 AM instead of midnight
    async cleanupExpiredKeys(): Promise<void> {
        this.logger.log('🧹 Starting cleanup of expired keys...');

        try {
            // Process all key types in parallel with controlled concurrency
            const keyTypeEntries = Object.entries(TOKEN_KEY_CONFIG);
            await this.processConcurrently(
                keyTypeEntries,
                async ([keyType, config]) => {
                    await this.cleanupExpiredKeysForType(keyType as KeyType, config.keyExpirationDays);
                },
                this.MAX_PARALLEL_OPERATIONS,
            );

            this.logger.log('✅ Expired keys cleanup completed');
        } catch (error) {
            this.logger.error('❌ Error during expired keys cleanup:', error);
        }
    }

    /**
     * Process items concurrently with controlled parallelism
     * @param items Array of items to process
     * @param processor Function to process each item
     * @param maxConcurrency Maximum number of concurrent operations
     */
    private async processConcurrently<T>(
        items: T[],
        processor: (item: T) => Promise<void>,
        maxConcurrency: number,
    ): Promise<void> {
        const semaphore: Promise<void>[] = Array.from({ length: maxConcurrency }, () => Promise.resolve());
        let semaphoreIndex = 0;

        const tasks = map(items, async (item) => {
            // Wait for available slot
            await semaphore[semaphoreIndex];

            // Process item and update semaphore
            semaphore[semaphoreIndex] = processor(item).catch((error) => {
                this.logger.error('Error processing item:', error);
                // Don't throw to avoid stopping other processes
            });

            semaphoreIndex = (semaphoreIndex + 1) % maxConcurrency;
        });

        await Promise.all(tasks);
        // Wait for all semaphore slots to complete
        await Promise.all(semaphore);
    }

    private async rotateKeysIfNeeded(keyType: KeyType, rotationDays: number): Promise<void> {
        try {
            // Single query to get all keys that might need rotation
            const keysToCheck = await this.securityKeyModel.findAll({
                where: {
                    keyType,
                    status: KEY_STATUSES.ACTIVE,
                },
                attributes: ['keyId', 'createdAt'], // Only fetch needed columns for initial check
                order: [['createdAt', 'ASC']], // Oldest first for consistent processing
            });

            if (keysToCheck.length === 0) {
                this.logger.debug(`✅ No ${keyType} keys found`);
                return;
            }

            // Filter keys that need rotation using lodash filter
            const keysNeedingRotation = filter(keysToCheck, (key) =>
                DateHelper.needsRotation(key.createdAt, rotationDays),
            );

            if (keysNeedingRotation.length === 0) {
                this.logger.debug(`✅ No ${keyType} keys need rotation`);
                return;
            }

            // Process in batches to avoid memory issues and database overload
            let rotatedCount = 0;
            for (let i = 0; i < keysNeedingRotation.length; i += this.BATCH_SIZE) {
                const batch = keysNeedingRotation.slice(i, i + this.BATCH_SIZE);

                // Fetch full key objects for the batch
                const fullKeys = await this.securityKeyModel.findAll({
                    where: {
                        keyId: { [Op.in]: map(batch, (k) => k.keyId) },
                    },
                });

                // Process batch in parallel
                const batchResults = await Promise.allSettled(map(fullKeys, (key) => this.rotateKey(key)));

                // Count successful rotations
                const batchSuccessCount = reduce(
                    batchResults,
                    (count, result) => {
                        if (result.status === 'fulfilled') {
                            return count + 1;
                        }
                        this.logger.error('Failed to rotate key in batch:', result.reason);
                        return count;
                    },
                    0,
                );

                rotatedCount += batchSuccessCount;
            }

            if (rotatedCount > 0) {
                this.logger.log(`🔑 Rotated ${rotatedCount} ${keyType} keys`);
            }
        } catch (error) {
            this.logger.error(`❌ Error rotating ${keyType} keys:`, error);
        }
    }

    private async cleanupExpiredKeysForType(keyType: KeyType, expirationDays: number): Promise<void> {
        try {
            // Optimize query to only get potentially expired keys
            const cutoffDate = new Date(Date.now() - expirationDays * 24 * 60 * 60 * 1000);

            const expiredKeys = await this.securityKeyModel.findAll({
                where: {
                    keyType,
                    status: { [Op.in]: [KEY_STATUSES.ACTIVE, KEY_STATUSES.ROTATING] },
                    createdAt: { [Op.lt]: cutoffDate }, // Pre-filter by creation date
                },
                attributes: ['keyId', 'createdAt'], // Only fetch needed columns
            });

            if (expiredKeys.length === 0) {
                this.logger.debug(`✅ No expired ${keyType} keys to clean up`);
                return;
            }

            // Double-check expiration using DateHelper
            const actuallyExpiredKeys = filter(expiredKeys, (key) =>
                DateHelper.isExpired(key.createdAt, expirationDays),
            );

            if (actuallyExpiredKeys.length === 0) {
                this.logger.debug(`✅ No ${keyType} keys actually expired after validation`);
                return;
            }

            // Process in batches
            let revokedCount = 0;
            for (let i = 0; i < actuallyExpiredKeys.length; i += this.BATCH_SIZE) {
                const batch = actuallyExpiredKeys.slice(i, i + this.BATCH_SIZE);

                // Process batch in parallel
                const batchResults = await Promise.allSettled(
                    map(batch, async (key) => {
                        await this.keyManagerService.revokeKey(
                            key.keyId,
                            'Automatic revocation - key expired',
                            'expired-key-cleanup',
                        );

                        const ageInDays = DateHelper.daysDiff(new Date(), key.createdAt);
                        this.logger.log(`🚫 Revoked expired key: ${key.keyId} (age: ${ageInDays} days)`);
                        return key;
                    }),
                );

                // Count successful revocations
                const batchSuccessCount = reduce(
                    batchResults,
                    (count, result) => {
                        if (result.status === 'fulfilled') {
                            return count + 1;
                        }
                        this.logger.error('Failed to revoke key in batch:', result.reason);
                        return count;
                    },
                    0,
                );

                revokedCount += batchSuccessCount;
            }

            if (revokedCount > 0) {
                this.logger.log(`🧹 Cleaned up ${revokedCount} expired ${keyType} keys`);
            }
        } catch (error) {
            this.logger.error(`❌ Error cleaning up expired keys for ${keyType}:`, error);
        }
    }

    private async rotateKey(oldKey: SecurityKey): Promise<void> {
        // Use database transaction for atomicity
        const transaction: Transaction = await this.securityKeyModel.sequelize.transaction();

        try {
            this.logger.log(`🔄 Starting rotation for key: ${oldKey.keyId}`);

            // Generate new key
            const newKeyId = await this.keyManagerService.generateKeyPair(oldKey.keyType, 'automatic-rotation');

            // Activate new key
            await this.keyManagerService.activateKey(newKeyId, 'scheduler');

            // Mark old key as rotating (will live until expiration)
            await oldKey.update(
                {
                    status: KEY_STATUSES.ROTATING,
                    metadata: {
                        ...oldKey.metadata,
                        rotationStarted: new Date().toISOString(),
                        replacedBy: newKeyId,
                    },
                },
                { transaction },
            );

            // Prepare rotation history data
            const config = get(KEY_CONFIGURATIONS, oldKey.keyType);
            const ageInDays = DateHelper.daysDiff(new Date(), oldKey.createdAt);
            const expirationDate = DateHelper.addDays(oldKey.createdAt, get(config, 'expirationDays', 90));
            const daysUntilExpiration = DateHelper.daysDiff(expirationDate, new Date());

            // Record rotation history
            await this.keyRotationHistoryModel.create(
                {
                    oldKeyId: oldKey.keyId,
                    newKeyId: newKeyId,
                    keyType: oldKey.keyType,
                    rotationType: 'scheduled',
                    rotationReason: 'scheduled-rotation',
                    rotatedBy: 'scheduler',
                    rotatedFromMachine: 'auto-scheduler',
                    metadata: {
                        scheduledRotation: true,
                        oldKeyAge: ageInDays,
                        rotationThresholdDays: get(config, 'rotationDays'),
                        willExpireInDays: daysUntilExpiration,
                    },
                },
                { transaction },
            );

            await transaction.commit();

            this.logger.log(
                `✅ Key rotation completed: ${oldKey.keyId} → ${newKeyId} (old key expires in ${daysUntilExpiration} days)`,
            );
        } catch (error) {
            await transaction.rollback();
            this.logger.error(`❌ Failed to rotate key ${oldKey.keyId}:`, error);
            throw error; // Re-throw for batch error handling
        }
    }

    async rotateKeyType(keyType: KeyType): Promise<string> {
        if (!keyType || typeof keyType !== 'string') {
            throw new Error('Invalid key type provided');
        }

        this.logger.log(`🔄 Manual rotation requested for key type: ${keyType}`);

        const config = get(KEY_CONFIGURATIONS, keyType);
        if (!config) {
            throw new Error(`No configuration found for key type: ${keyType}`);
        }

        // Find current active key
        const currentKey = await this.securityKeyModel.findOne({
            where: {
                keyType,
                status: KEY_STATUSES.ACTIVE,
            },
            order: [['createdAt', 'DESC']],
        });

        if (!currentKey) {
            throw new Error(`No active key found for type: ${keyType}`);
        }

        // Perform rotation
        await this.rotateKey(currentKey);

        // Return new active key ID
        return await this.keyManagerService.getActiveKey(keyType);
    }

    async getRotationStatus(): Promise<Record<string, any>> {
        const status: Record<string, any> = {};

        // Use Promise.all to fetch all key type statuses in parallel
        const keyTypeEntries = Object.entries(TOKEN_KEY_CONFIG);
        const statusPromises = map(keyTypeEntries, async ([keyType, config]) => {
            const keys = await this.getKeysStatus(keyType as KeyType);

            // Use lodash filter
            const keysNeedingRotation = filter(keys, (k) => DateHelper.needsRotation(k.createdAt, config.rotationDays));

            return {
                keyType: toUpper(keyType), // Use lodash toUpper
                data: {
                    totalActiveKeys: keys.length,
                    keysNeedingRotation: keysNeedingRotation.length,
                    oldestKeyAge: keys.length > 0 ? DateHelper.daysDiff(new Date(), keys[0].createdAt) : 0,
                    rotationDays: config.rotationDays,
                    expirationDays: config.keyExpirationDays,
                },
            };
        });

        const results = await Promise.all(statusPromises);

        // Convert results back to object using lodash forEach
        forEach(results, (result) => {
            status[result.keyType] = result.data;
        });

        return status;
    }

    private async getKeysStatus(keyType: KeyType) {
        return await this.securityKeyModel.findAll({
            where: {
                keyType,
                status: KEY_STATUSES.ACTIVE,
            },
            attributes: ['keyId', 'createdAt'], // Only fetch needed columns
            order: [['createdAt', 'ASC']],
        });
    }
}
