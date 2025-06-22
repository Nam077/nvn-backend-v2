import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

import { includes, some, toLower } from 'lodash';

import { ConfigServiceApp } from '@/modules/config/config.service';

export interface EnvironmentKeys {
    masterKey: string;
}

@Injectable()
export class EnvironmentKeyLoaderService implements OnModuleDestroy {
    private readonly logger = new Logger(EnvironmentKeyLoaderService.name);
    private keys: EnvironmentKeys | null = null;

    constructor(private readonly configService: ConfigServiceApp) {
        this.loadAndValidateKeys();
    }

    getEnvironmentKeys(): EnvironmentKeys {
        if (!this.keys) {
            throw new Error('Environment keys not loaded');
        }
        return this.keys;
    }

    /**
     * Load and validate all required keys from environment
     */
    private loadAndValidateKeys(): void {
        try {
            const masterKey = this.configService.securityMasterKey;

            // Validate master key
            this.validateMasterKey(masterKey);

            this.keys = {
                masterKey,
            };

            this.logger.log('✅ Environment keys loaded and validated successfully');
        } catch (error) {
            this.logger.error('❌ Failed to load environment keys:', error);
            throw error;
        }
    }

    private validateMasterKey(key: string): void {
        if (!key) {
            throw new Error('SECURITY_MASTER_KEY is required');
        }

        if (key.length < 64) {
            throw new Error('SECURITY_MASTER_KEY must be at least 64 characters long');
        }

        // Check for weak patterns
        const forbiddenValues = [
            'your-super-secret-key-here',
            'change-me',
            'default',
            'test',
            '1234567890',
            'abcdefghij',
        ];

        if (some(forbiddenValues, (forbidden) => includes(toLower(key), forbidden))) {
            throw new Error('SECURITY_MASTER_KEY contains forbidden weak patterns');
        }

        // Basic entropy check (should have mixed characters)
        const hasLower = /[a-z]/.test(key);
        const hasUpper = /[A-Z]/.test(key);
        const hasNumber = /[0-9]/.test(key);
        const hasSpecial = /[^a-zA-Z0-9]/.test(key);

        if (!(hasLower && hasUpper && hasNumber && hasSpecial)) {
            this.logger.warn(
                '⚠️  SECURITY_MASTER_KEY should contain mixed case, numbers, and special characters for better security',
            );
        }
    }

    /**
     * Cleanup on module destroy
     */
    onModuleDestroy(): void {
        // Clear keys from memory for security
        if (this.keys) {
            this.keys = null;
        }
        this.logger.log('🧹 Environment keys cleared from memory');
    }
}
