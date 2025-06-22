import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/sequelize';

import { values, get, filter, isEmpty, isString, isObject, defaultTo, map, set } from 'lodash';
import { Op } from 'sequelize';

import { KeyManagerService } from './key-manager.service';
import { KEY_CONFIGURATIONS, KeyTimeCalculator, KeyTimingValidator } from '../config/key.config';
import { KeyRotationHistory } from '../entities/key-rotation-history.entity';
import { SecurityKey } from '../entities/security-key.entity';
import {
    KeyType,
    KEY_STATUSES,
    KEY_TYPES,
    KeyConfiguration,
    RotationStatusData,
    TimingAnalysisResult,
    KeyTimingInfo,
} from '../types/key.types';

@Injectable()
export class KeyRotationSchedulerService {
    private readonly logger = new Logger(KeyRotationSchedulerService.name);

    constructor(
        @InjectModel(SecurityKey)
        private readonly securityKeyModel: typeof SecurityKey,
        @InjectModel(KeyRotationHistory)
        private readonly keyRotationHistoryModel: typeof KeyRotationHistory,
        private readonly keyManagerService: KeyManagerService,
    ) {
        // Validate all key configurations on startup
        try {
            KeyTimingValidator.validateAllConfigurations();
            this.logger.log('✅ All key configurations validated successfully');
        } catch (error) {
            this.logger.error('❌ Key configuration validation failed:', error);
            throw error;
        }
    }

    /**
     * Check for key rotation every day at noon
     * Runs daily instead of hourly for better performance
     */
    @Cron(CronExpression.EVERY_DAY_AT_NOON)
    async checkKeyRotation(): Promise<void> {
        this.logger.log('🔄 Starting scheduled key rotation check...');

        try {
            // Check all key types for rotation needs
            const keyTypes = values(KEY_TYPES);

            for (const keyType of keyTypes) {
                await this.processKeyTypeRotation(keyType);
            }

            this.logger.log('✅ Scheduled key rotation check completed');
        } catch (error) {
            this.logger.error('❌ Error during scheduled key rotation:', error);
        }
    }

    /**
     * Process rotation for a specific key type
     * @param keyType - The type of key to process for rotation
     */
    private async processKeyTypeRotation(keyType: KeyType): Promise<void> {
        // Validate input
        if (isEmpty(keyType) || !isString(keyType)) {
            this.logger.warn(`⚠️ Invalid key type: ${String(keyType)}`);
            return;
        }

        const config = get(KEY_CONFIGURATIONS, keyType);
        if (!isObject(config) || isEmpty(config)) {
            this.logger.warn(`⚠️ No configuration found for key type: ${keyType}`);
            return;
        }

        try {
            // Use centralized time calculation from config
            const rotationThreshold = KeyTimeCalculator.getRotationThreshold(keyType);

            const keysNeedingRotation = await this.securityKeyModel.findAll({
                where: {
                    keyType,
                    status: KEY_STATUSES.ACTIVE,
                    createdAt: { [Op.lt]: rotationThreshold },
                },
                order: [['createdAt', 'ASC']],
            });

            if (keysNeedingRotation.length === 0) {
                this.logger.debug(`✅ No ${keyType} keys need rotation`);
                return;
            }

            this.logger.log(`🔑 Found ${keysNeedingRotation.length} ${keyType} keys needing rotation`);

            for (const oldKey of keysNeedingRotation) {
                await this.rotateKey(oldKey, config);
            }
        } catch (error) {
            this.logger.error(`❌ Error processing rotation for ${keyType}:`, error);
        }
    }

    /**
     * Rotate a specific key
     * @param oldKey - The key to be rotated
     * @param config - The configuration for this key type
     */
    private async rotateKey(oldKey: SecurityKey, config: KeyConfiguration): Promise<void> {
        // Validate inputs
        if (!isObject(oldKey) || isEmpty(get(oldKey, 'keyId'))) {
            this.logger.error('❌ Invalid old key provided for rotation');
            return;
        }

        if (!isObject(config)) {
            this.logger.error('❌ Invalid config provided for rotation');
            return;
        }

        try {
            this.logger.log(`🔄 Starting rotation for key: ${oldKey.keyId}`);

            // Step 1: Generate new key
            const newKeyId = await this.keyManagerService.generateKeyPair(oldKey.keyType, 'automatic-rotation');

            // Step 2: Activate new key
            await this.keyManagerService.activateKey(newKeyId, 'scheduler');

            // Step 3: Mark old key as rotating (keep for grace period)
            await oldKey.update({
                status: KEY_STATUSES.ROTATING,
                metadata: {
                    ...defaultTo(oldKey.metadata, {}),
                    rotationStarted: new Date().toISOString(),
                    replacedBy: newKeyId,
                },
            });

            // Step 4: Record rotation history with timing info
            const timingInfo = KeyTimeCalculator.getKeyTimingInfo(oldKey.keyType, oldKey.createdAt);

            await this.keyRotationHistoryModel.create({
                oldKeyId: oldKey.keyId,
                newKeyId: newKeyId,
                keyType: oldKey.keyType,
                rotationType: 'scheduled',
                rotationReason: 'scheduled-rotation',
                rotatedBy: 'scheduler',
                rotatedFromMachine: 'auto-scheduler',
                metadata: {
                    scheduledRotation: true,
                    oldKeyAge: timingInfo.ageInDays,
                    rotationThresholdDays: get(config, 'rotationDays'),
                    timingInfo: {
                        ...timingInfo,
                        // Remove circular references
                        createdAt: timingInfo.createdAt.toISOString(),
                        referenceDate: timingInfo.referenceDate.toISOString(),
                        nextRotationDate: timingInfo.nextRotationDate.toISOString(),
                        expirationDate: timingInfo.expirationDate.toISOString(),
                    },
                },
            });

            // Step 5: Schedule old key for revocation after grace period
            // Use centralized grace period calculation
            const gracePeriodMs = KeyTimeCalculator.getGracePeriodMs(oldKey.keyType);
            const gracePeriodHours = Math.round(gracePeriodMs / 1000 / 60 / 60);

            // Note: In production, use a proper job queue instead of setTimeout
            setTimeout(() => {
                void this.revokeOldKey(oldKey.keyId, newKeyId);
            }, gracePeriodMs);

            this.logger.log(
                `✅ Key rotation completed: ${oldKey.keyId} → ${newKeyId} (grace period: ${gracePeriodHours}h)`,
            );
        } catch (error) {
            this.logger.error(`❌ Failed to rotate key ${oldKey.keyId}:`, error);
        }
    }

    /**
     * Revoke old key after grace period
     * @param oldKeyId - The ID of the old key to revoke
     * @param newKeyId - The ID of the new key that replaced it
     */
    private async revokeOldKey(oldKeyId: string, newKeyId: string): Promise<void> {
        // Validate inputs
        if (isEmpty(oldKeyId) || !isString(oldKeyId)) {
            this.logger.error('❌ Invalid old key ID for revocation');
            return;
        }
        if (isEmpty(newKeyId) || !isString(newKeyId)) {
            this.logger.error('❌ Invalid new key ID for revocation');
            return;
        }

        try {
            await this.keyManagerService.revokeKey(
                oldKeyId,
                `Automatic revocation after rotation to ${newKeyId}`,
                'scheduler',
            );
            this.logger.log(`🚫 Revoked old key after grace period: ${oldKeyId}`);
        } catch (error) {
            this.logger.error(`❌ Failed to revoke old key ${oldKeyId}:`, error);
        }
    }

    /**
     * Manual key rotation for specific key type
     * @param keyType - The type of key to rotate
     * @returns The ID of the new active key
     */
    async rotateKeyType(keyType: KeyType): Promise<string> {
        // Validate input
        if (isEmpty(keyType) || !isString(keyType)) {
            throw new Error('Invalid key type provided');
        }

        this.logger.log(`🔄 Manual rotation requested for key type: ${keyType}`);

        const config = get(KEY_CONFIGURATIONS, keyType);
        if (!isObject(config) || isEmpty(config)) {
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
        await this.rotateKey(currentKey, config);

        // Return new active key ID
        return await this.keyManagerService.getActiveKey(keyType);
    }

    /**
     * Get rotation status for all key types using centralized time calculations
     * @returns Object containing rotation status for each key type
     */
    async getRotationStatus(): Promise<Record<string, RotationStatusData | { error: string }>> {
        const status: Record<string, RotationStatusData | { error: string }> = {};
        const keyTypes = values(KEY_TYPES);

        for (const keyType of keyTypes) {
            try {
                const config = get(KEY_CONFIGURATIONS, keyType);
                if (!isObject(config)) {
                    this.logger.warn(`⚠️ Skipping status for invalid key type: ${keyType}`);
                    continue;
                }

                const activeKeys = await this.securityKeyModel.findAll({
                    where: {
                        keyType,
                        status: KEY_STATUSES.ACTIVE,
                    },
                    order: [['createdAt', 'DESC']],
                });

                // Use centralized time calculation utilities
                const keysNeedingRotation = filter(activeKeys, (key) =>
                    KeyTimeCalculator.needsRotation(keyType, key.createdAt),
                );

                // Enhanced status with timing information
                const keyTypeStatus: RotationStatusData = {
                    totalActiveKeys: activeKeys.length,
                    keysNeedingRotation: keysNeedingRotation.length,
                    nextRotationDue:
                        activeKeys.length > 0
                            ? KeyTimeCalculator.getNextRotationDate(keyType, activeKeys[0].createdAt)
                            : null,
                    rotationThresholdDays: get(config, 'rotationDays', 0),
                    expirationDays: get(config, 'expirationDays', 0),
                    gracePeriodMs: KeyTimeCalculator.getGracePeriodMs(keyType),

                    // Additional timing info for monitoring - map to KeyTimingInfo interface
                    keys: map(activeKeys, (key): KeyTimingInfo => {
                        const timingInfo = KeyTimeCalculator.getKeyTimingInfo(keyType, key.createdAt);
                        return {
                            keyId: key.keyId,
                            createdAt: key.createdAt,
                            ageInDays: timingInfo.ageInDays,
                            needsRotation: timingInfo.needsRotation,
                            isExpired: timingInfo.isExpired,
                            daysUntilExpiration: timingInfo.daysUntilExpiration,
                            nextRotationDate: timingInfo.nextRotationDate,
                            expirationDate: timingInfo.expirationDate,
                        };
                    }),
                };

                // Use safe property assignment with lodash set
                set(status, keyType, keyTypeStatus);
            } catch (error) {
                this.logger.error(`❌ Error getting status for ${keyType}:`, error);
                // Use safe property assignment with lodash set
                set(status, keyType, {
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        return status;
    }

    /**
     * Get detailed timing analysis for all keys
     * @returns Comprehensive timing analysis
     */
    async getTimingAnalysis(): Promise<TimingAnalysisResult> {
        const analysis: TimingAnalysisResult = {
            generatedAt: new Date(),
            summary: {
                totalKeyTypes: 0,
                totalActiveKeys: 0,
                keysNeedingRotation: 0,
                expiredKeys: 0,
            },
            keyTypes: {},
        };

        const keyTypes = values(KEY_TYPES);

        for (const keyType of keyTypes) {
            try {
                const activeKeys = await this.securityKeyModel.findAll({
                    where: {
                        keyType,
                        status: { [Op.in]: [KEY_STATUSES.ACTIVE, KEY_STATUSES.ROTATING] },
                    },
                    order: [['createdAt', 'DESC']],
                });

                const timingAnalysis = map(activeKeys, (key) =>
                    KeyTimeCalculator.getKeyTimingInfo(keyType, key.createdAt),
                );

                const needsRotation = filter(timingAnalysis, (t) => t.needsRotation).length;
                const expired = filter(timingAnalysis, (t) => t.isExpired).length;

                const keyTypeAnalysis = {
                    totalKeys: activeKeys.length,
                    needsRotation,
                    expired,
                    analysis: timingAnalysis,
                };

                // Use safe property assignment with lodash set
                set(analysis.keyTypes, keyType, keyTypeAnalysis);

                // Update summary
                analysis.summary.totalKeyTypes += 1;
                analysis.summary.totalActiveKeys += activeKeys.length;
                analysis.summary.keysNeedingRotation += needsRotation;
                analysis.summary.expiredKeys += expired;
            } catch (error) {
                this.logger.error(`❌ Error in timing analysis for ${keyType}:`, error);
            }
        }

        return analysis;
    }
}
