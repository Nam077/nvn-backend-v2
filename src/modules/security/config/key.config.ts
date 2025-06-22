import { get, isNumber, defaultTo, keys } from 'lodash';

import { KEY_TYPES, KEY_ALGORITHMS, KeyType, KeyAlgorithm, KeyConfiguration } from '../types/key.types';

export const KEY_CONFIGURATIONS: Record<KeyType, KeyConfiguration> = {
    [KEY_TYPES.ACCESS_TOKEN]: {
        type: KEY_TYPES.ACCESS_TOKEN,
        algorithm: KEY_ALGORITHMS.RS256,
        keySize: 2048,
        expirationDays: 90, // Key expires in 90 days
        rotationDays: 30, // Rotate every 30 days
        maxConcurrentKeys: 2, // Allow 2 active keys during rotation
        requiresAsymmetric: true,
        contextBinding: ['timestamp', 'machine', 'app', 'user_context'],
    },

    [KEY_TYPES.REFRESH_TOKEN]: {
        type: KEY_TYPES.REFRESH_TOKEN,
        algorithm: KEY_ALGORITHMS.RS256,
        keySize: 2048,
        expirationDays: 180, // Longer expiration for refresh tokens
        rotationDays: 60, // Rotate every 60 days
        maxConcurrentKeys: 2,
        requiresAsymmetric: true,
        contextBinding: ['timestamp', 'machine', 'app', 'device_binding'],
    },

    [KEY_TYPES.EMAIL_VERIFICATION]: {
        type: KEY_TYPES.EMAIL_VERIFICATION,
        algorithm: KEY_ALGORITHMS.HS256,
        expirationDays: 30,
        rotationDays: 15,
        maxConcurrentKeys: 2,
        requiresAsymmetric: false,
        contextBinding: ['timestamp', 'machine', 'app', 'email_context'],
    },

    [KEY_TYPES.PASSWORD_RESET]: {
        type: KEY_TYPES.PASSWORD_RESET,
        algorithm: KEY_ALGORITHMS.HS256,
        expirationDays: 7, // Short expiration for security
        rotationDays: 3, // Frequent rotation
        maxConcurrentKeys: 1, // Only 1 active key
        requiresAsymmetric: false,
        contextBinding: ['timestamp', 'machine', 'app', 'security_context'],
    },

    [KEY_TYPES.API_KEY]: {
        type: KEY_TYPES.API_KEY,
        algorithm: KEY_ALGORITHMS.ES256,
        expirationDays: 365, // 1 year for API keys
        rotationDays: 180, // Rotate every 6 months
        maxConcurrentKeys: 3, // Allow multiple for gradual migration
        requiresAsymmetric: true,
        contextBinding: ['timestamp', 'machine', 'app', 'api_context', 'client_id'],
    },

    [KEY_TYPES.WEBHOOK_SIGNATURE]: {
        type: KEY_TYPES.WEBHOOK_SIGNATURE,
        algorithm: KEY_ALGORITHMS.HS256,
        expirationDays: 90,
        rotationDays: 30,
        maxConcurrentKeys: 2,
        requiresAsymmetric: false,
        contextBinding: ['timestamp', 'machine', 'app', 'webhook_context'],
    },

    [KEY_TYPES.FILE_ENCRYPTION]: {
        type: KEY_TYPES.FILE_ENCRYPTION,
        algorithm: KEY_ALGORITHMS.RS256,
        keySize: 4096, // Stronger encryption for files
        expirationDays: 730, // 2 years
        rotationDays: 365, // Rotate yearly
        maxConcurrentKeys: 3, // Keep old keys for decryption
        requiresAsymmetric: true,
        contextBinding: ['timestamp', 'machine', 'app', 'file_context', 'user_id'],
    },

    [KEY_TYPES.DATABASE_ENCRYPTION]: {
        type: KEY_TYPES.DATABASE_ENCRYPTION,
        algorithm: KEY_ALGORITHMS.RS256,
        keySize: 4096,
        expirationDays: 1095, // 3 years
        rotationDays: 365, // Yearly rotation
        maxConcurrentKeys: 5, // Keep multiple for data migration
        requiresAsymmetric: true,
        contextBinding: ['timestamp', 'machine', 'app', 'db_context', 'schema_version'],
    },

    [KEY_TYPES.SESSION_ENCRYPTION]: {
        type: KEY_TYPES.SESSION_ENCRYPTION,
        algorithm: KEY_ALGORITHMS.HS256,
        expirationDays: 30,
        rotationDays: 7, // Weekly rotation for sessions
        maxConcurrentKeys: 2,
        requiresAsymmetric: false,
        contextBinding: ['timestamp', 'machine', 'app', 'session_context'],
    },
};

export const MASTER_KEY_CONFIG = {
    minimumLength: 32,
    requiredEntropyBits: 128,
    forbiddenValues: ['master_key', 'secret', 'password', '123456', 'your_key_here', 'default', 'test', 'demo'],
};

export const CRYPTO_CONFIG = {
    pbkdf2: {
        iterations: 600000, // OWASP recommended
        keyLength: 64, // 512-bit
        digest: 'sha512',
    },
    hkdf: {
        keyLength: 64, // 512-bit
        digest: 'sha256',
    },
    argon2: {
        memory: 65536, // 64MB
        time: 3, // 3 iterations
        parallelism: 4, // 4 threads
        hashLength: 32, // 256-bit
        type: 'argon2id',
    },
    aes: {
        algorithm: 'aes-256-gcm',
        ivLength: 12, // GCM requires 12-byte IV
        tagLength: 16, // 128-bit auth tag
    },
} as const;

// ==================== TIME CALCULATION UTILITIES ====================

/**
 * Time constants for consistent calculations across the application
 */
export const TIME_CONSTANTS = {
    MILLISECONDS_PER_SECOND: 1000,
    SECONDS_PER_MINUTE: 60,
    MINUTES_PER_HOUR: 60,
    HOURS_PER_DAY: 24,

    // Derived constants
    get MILLISECONDS_PER_MINUTE() {
        return this.MILLISECONDS_PER_SECOND * this.SECONDS_PER_MINUTE;
    },
    get MILLISECONDS_PER_HOUR() {
        return this.MILLISECONDS_PER_MINUTE * this.MINUTES_PER_HOUR;
    },
    get MILLISECONDS_PER_DAY() {
        return this.MILLISECONDS_PER_HOUR * this.HOURS_PER_DAY;
    },
} as const;

/**
 * Key rotation and expiration utilities
 */
export class KeyTimeCalculator {
    /**
     * Calculate rotation threshold date for a key type
     * @param keyType - The type of key
     * @param baseTime - Base time to calculate from (default: now)
     * @returns Date when rotation should occur
     */
    static getRotationThreshold(keyType: KeyType, baseTime?: Date): Date {
        const config = get(KEY_CONFIGURATIONS, keyType);
        if (!config) {
            throw new Error(`No configuration found for key type: ${keyType}`);
        }

        const rotationDays = defaultTo(get(config, 'rotationDays'), 30);
        const base = baseTime ? baseTime.getTime() : Date.now();

        return new Date(base - rotationDays * TIME_CONSTANTS.MILLISECONDS_PER_DAY);
    }

    /**
     * Calculate expiration date for a key
     * @param keyType - The type of key
     * @param creationTime - When the key was created (default: now)
     * @returns Date when key expires
     */
    static getExpirationDate(keyType: KeyType, creationTime?: Date): Date {
        const config = get(KEY_CONFIGURATIONS, keyType);
        if (!config) {
            throw new Error(`No configuration found for key type: ${keyType}`);
        }

        const expirationDays = defaultTo(get(config, 'expirationDays'), 90);
        const base = creationTime ? creationTime.getTime() : Date.now();

        return new Date(base + expirationDays * TIME_CONSTANTS.MILLISECONDS_PER_DAY);
    }

    /**
     * Calculate next rotation date for an existing key
     * @param keyType - The type of key
     * @param keyCreationDate - When the key was created
     * @returns Date when the key should be rotated
     */
    static getNextRotationDate(keyType: KeyType, keyCreationDate: Date): Date {
        const config = get(KEY_CONFIGURATIONS, keyType);
        if (!config) {
            throw new Error(`No configuration found for key type: ${keyType}`);
        }

        const rotationDays = defaultTo(get(config, 'rotationDays'), 30);
        return new Date(keyCreationDate.getTime() + rotationDays * TIME_CONSTANTS.MILLISECONDS_PER_DAY);
    }

    /**
     * Check if a key needs rotation
     * @param keyType - The type of key
     * @param keyCreationDate - When the key was created
     * @param checkTime - Time to check against (default: now)
     * @returns True if key needs rotation
     */
    static needsRotation(keyType: KeyType, keyCreationDate: Date, checkTime?: Date): boolean {
        const rotationThreshold = this.getRotationThreshold(keyType, checkTime);
        return keyCreationDate < rotationThreshold;
    }

    /**
     * Check if a key is expired
     * @param keyType - The type of key
     * @param keyCreationDate - When the key was created
     * @param checkTime - Time to check against (default: now)
     * @returns True if key is expired
     */
    static isExpired(keyType: KeyType, keyCreationDate: Date, checkTime?: Date): boolean {
        const expirationDate = this.getExpirationDate(keyType, keyCreationDate);
        const check = checkTime || new Date();
        return check > expirationDate;
    }

    /**
     * Get grace period for key rotation (time to keep old key active)
     * @param keyType - The type of key
     * @returns Grace period in milliseconds
     */
    static getGracePeriodMs(keyType: KeyType): number {
        const config = get(KEY_CONFIGURATIONS, keyType);
        if (!config) {
            throw new Error(`No configuration found for key type: ${keyType}`);
        }

        // Grace period is typically 1 day, but can be configured based on key type
        const graceDays = get(config, 'gracePeriodDays', 1);
        return graceDays * TIME_CONSTANTS.MILLISECONDS_PER_DAY;
    }

    /**
     * Get age of a key in days
     * @param keyCreationDate - When the key was created
     * @param referenceDate - Reference date (default: now)
     * @returns Age in days
     */
    static getKeyAgeInDays(keyCreationDate: Date, referenceDate?: Date): number {
        const reference = referenceDate || new Date();
        const diffMs = reference.getTime() - keyCreationDate.getTime();
        return Math.floor(diffMs / TIME_CONSTANTS.MILLISECONDS_PER_DAY);
    }

    /**
     * Get days until key expiration
     * @param keyType - The type of key
     * @param keyCreationDate - When the key was created
     * @param referenceDate - Reference date (default: now)
     * @returns Days until expiration (negative if already expired)
     */
    static getDaysUntilExpiration(keyType: KeyType, keyCreationDate: Date, referenceDate?: Date): number {
        const expirationDate = this.getExpirationDate(keyType, keyCreationDate);
        const reference = referenceDate || new Date();
        const diffMs = expirationDate.getTime() - reference.getTime();
        return Math.ceil(diffMs / TIME_CONSTANTS.MILLISECONDS_PER_DAY);
    }

    /**
     * Get all rotation and expiration info for a key
     * @param keyType - The type of key
     * @param keyCreationDate - When the key was created
     * @param referenceDate - Reference date (default: now)
     * @returns Complete timing information
     */
    static getKeyTimingInfo(keyType: KeyType, keyCreationDate: Date, referenceDate?: Date) {
        const reference = referenceDate || new Date();

        return {
            keyType,
            createdAt: keyCreationDate,
            referenceDate: reference,
            ageInDays: this.getKeyAgeInDays(keyCreationDate, reference),
            needsRotation: this.needsRotation(keyType, keyCreationDate, reference),
            isExpired: this.isExpired(keyType, keyCreationDate, reference),
            nextRotationDate: this.getNextRotationDate(keyType, keyCreationDate),
            expirationDate: this.getExpirationDate(keyType, keyCreationDate),
            daysUntilExpiration: this.getDaysUntilExpiration(keyType, keyCreationDate, reference),
            gracePeriodMs: this.getGracePeriodMs(keyType),
        };
    }
}

/**
 * Validation utilities for key timing
 */
export class KeyTimingValidator {
    /**
     * Validate that rotation days is less than expiration days
     * @param keyType - The type of key to validate
     * @returns True if valid, throws error if invalid
     */
    static validateRotationConfig(keyType: KeyType): boolean {
        const config = get(KEY_CONFIGURATIONS, keyType);
        if (!config) {
            throw new Error(`No configuration found for key type: ${keyType}`);
        }

        const rotationDays = get(config, 'rotationDays', 0);
        const expirationDays = get(config, 'expirationDays', 0);

        if (!isNumber(rotationDays) || !isNumber(expirationDays)) {
            throw new Error(`Invalid rotation or expiration days for key type: ${keyType}`);
        }

        if (rotationDays >= expirationDays) {
            throw new Error(
                `Rotation days (${rotationDays}) must be less than expiration days (${expirationDays}) for key type: ${keyType}`,
            );
        }

        if (rotationDays <= 0 || expirationDays <= 0) {
            throw new Error(`Rotation and expiration days must be positive for key type: ${keyType}`);
        }

        return true;
    }

    /**
     * Validate all key configurations
     * @returns True if all valid, throws error for first invalid found
     */
    static validateAllConfigurations(): boolean {
        for (const keyType of keys(KEY_CONFIGURATIONS) as KeyType[]) {
            this.validateRotationConfig(keyType);
        }
        return true;
    }
}
