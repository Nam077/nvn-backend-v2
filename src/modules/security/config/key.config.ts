import { get } from 'lodash';

import { KEY_TYPES, KEY_ALGORITHMS, KeyType, KeyAlgorithm, KeyConfiguration } from '../types/key.types';

// ==================== COMPLETE TOKEN CONFIG ====================

/**
 * Complete token configuration with proper types
 * Formula: Key expiration = rotation + token_life + 1
 */
export interface TokenKeyConfig {
    tokenLifeDays: number;
    rotationDays: number;
    keyExpirationDays: number;
    expiresIn: string;
    seconds: number;
}

export const TOKEN_KEY_CONFIG: Record<KeyType, TokenKeyConfig> = {
    [KEY_TYPES.ACCESS_TOKEN]: {
        tokenLifeDays: 1, // Token sống 1 ngày
        rotationDays: 30, // Key rotate mỗi 30 ngày
        keyExpirationDays: 32, // 30 + 1 + 1 = 32 ngày
        expiresIn: '1d',
        seconds: 86400,
    },
    [KEY_TYPES.REFRESH_TOKEN]: {
        tokenLifeDays: 30, // Token sống 30 ngày
        rotationDays: 60, // Key rotate mỗi 60 ngày
        keyExpirationDays: 91, // 60 + 30 + 1 = 91 ngày
        expiresIn: '30d',
        seconds: 2592000,
    },
    [KEY_TYPES.EMAIL_VERIFICATION]: {
        tokenLifeDays: 1, // Token sống 1 ngày
        rotationDays: 15, // Key rotate mỗi 15 ngày
        keyExpirationDays: 17, // 15 + 1 + 1 = 17 ngày
        expiresIn: '1d',
        seconds: 86400,
    },
    [KEY_TYPES.PASSWORD_RESET]: {
        tokenLifeDays: 0.04, // Token sống 1 giờ (1/24)
        rotationDays: 3, // Key rotate mỗi 3 ngày
        keyExpirationDays: 5, // 3 + 0.04 + 1 = ~5 ngày
        expiresIn: '1h',
        seconds: 3600,
    },
    [KEY_TYPES.API_KEY]: {
        tokenLifeDays: 7, // Token sống 7 ngày
        rotationDays: 180, // Key rotate mỗi 180 ngày
        keyExpirationDays: 188, // 180 + 7 + 1 = 188 ngày
        expiresIn: '7d',
        seconds: 604800,
    },
    [KEY_TYPES.WEBHOOK_SIGNATURE]: {
        tokenLifeDays: 1, // Token sống 1 ngày
        rotationDays: 30, // Key rotate mỗi 30 ngày
        keyExpirationDays: 32, // 30 + 1 + 1 = 32 ngày
        expiresIn: '1d',
        seconds: 86400,
    },
    [KEY_TYPES.FILE_ENCRYPTION]: {
        tokenLifeDays: 30, // Token sống 30 ngày
        rotationDays: 365, // Key rotate mỗi 365 ngày
        keyExpirationDays: 396, // 365 + 30 + 1 = 396 ngày
        expiresIn: '30d',
        seconds: 2592000,
    },
    [KEY_TYPES.DATABASE_ENCRYPTION]: {
        tokenLifeDays: 90, // Token sống 90 ngày
        rotationDays: 365, // Key rotate mỗi 365 ngày
        keyExpirationDays: 456, // 365 + 90 + 1 = 456 ngày
        expiresIn: '90d',
        seconds: 7776000,
    },
    [KEY_TYPES.SESSION_ENCRYPTION]: {
        tokenLifeDays: 1, // Token sống 1 ngày
        rotationDays: 7, // Key rotate mỗi 7 ngày
        keyExpirationDays: 9, // 7 + 1 + 1 = 9 ngày
        expiresIn: '1d',
        seconds: 86400,
    },
} as const;

export const KEY_CONFIGURATIONS: Record<KeyType, KeyConfiguration> = {
    [KEY_TYPES.ACCESS_TOKEN]: {
        type: KEY_TYPES.ACCESS_TOKEN,
        algorithm: KEY_ALGORITHMS.RS256,
        keySize: 2048,
        expirationDays: TOKEN_KEY_CONFIG[KEY_TYPES.ACCESS_TOKEN].keyExpirationDays,
        rotationDays: TOKEN_KEY_CONFIG[KEY_TYPES.ACCESS_TOKEN].rotationDays,
        maxConcurrentKeys: 3,
        requiresAsymmetric: true,
        contextBinding: ['timestamp', 'machine', 'app', 'user_context'],
    },

    [KEY_TYPES.REFRESH_TOKEN]: {
        type: KEY_TYPES.REFRESH_TOKEN,
        algorithm: KEY_ALGORITHMS.RS256,
        keySize: 2048,
        expirationDays: TOKEN_KEY_CONFIG[KEY_TYPES.REFRESH_TOKEN].keyExpirationDays,
        rotationDays: TOKEN_KEY_CONFIG[KEY_TYPES.REFRESH_TOKEN].rotationDays,
        maxConcurrentKeys: 3,
        requiresAsymmetric: true,
        contextBinding: ['timestamp', 'machine', 'app', 'device_binding'],
    },

    [KEY_TYPES.EMAIL_VERIFICATION]: {
        type: KEY_TYPES.EMAIL_VERIFICATION,
        algorithm: KEY_ALGORITHMS.HS256,
        expirationDays: TOKEN_KEY_CONFIG[KEY_TYPES.EMAIL_VERIFICATION].keyExpirationDays,
        rotationDays: TOKEN_KEY_CONFIG[KEY_TYPES.EMAIL_VERIFICATION].rotationDays,
        maxConcurrentKeys: 3,
        requiresAsymmetric: false,
        contextBinding: ['timestamp', 'machine', 'app', 'email_context'],
    },

    [KEY_TYPES.PASSWORD_RESET]: {
        type: KEY_TYPES.PASSWORD_RESET,
        algorithm: KEY_ALGORITHMS.HS256,
        expirationDays: TOKEN_KEY_CONFIG[KEY_TYPES.PASSWORD_RESET].keyExpirationDays,
        rotationDays: TOKEN_KEY_CONFIG[KEY_TYPES.PASSWORD_RESET].rotationDays,
        maxConcurrentKeys: 2,
        requiresAsymmetric: false,
        contextBinding: ['timestamp', 'machine', 'app', 'security_context'],
    },

    [KEY_TYPES.API_KEY]: {
        type: KEY_TYPES.API_KEY,
        algorithm: KEY_ALGORITHMS.ES256,
        expirationDays: TOKEN_KEY_CONFIG[KEY_TYPES.API_KEY].keyExpirationDays,
        rotationDays: TOKEN_KEY_CONFIG[KEY_TYPES.API_KEY].rotationDays,
        maxConcurrentKeys: 4,
        requiresAsymmetric: true,
        contextBinding: ['timestamp', 'machine', 'app', 'api_context', 'client_id'],
    },

    [KEY_TYPES.WEBHOOK_SIGNATURE]: {
        type: KEY_TYPES.WEBHOOK_SIGNATURE,
        algorithm: KEY_ALGORITHMS.HS256,
        expirationDays: TOKEN_KEY_CONFIG[KEY_TYPES.WEBHOOK_SIGNATURE].keyExpirationDays,
        rotationDays: TOKEN_KEY_CONFIG[KEY_TYPES.WEBHOOK_SIGNATURE].rotationDays,
        maxConcurrentKeys: 3,
        requiresAsymmetric: false,
        contextBinding: ['timestamp', 'machine', 'app', 'webhook_context'],
    },

    [KEY_TYPES.FILE_ENCRYPTION]: {
        type: KEY_TYPES.FILE_ENCRYPTION,
        algorithm: KEY_ALGORITHMS.RS256,
        keySize: 4096,
        expirationDays: TOKEN_KEY_CONFIG[KEY_TYPES.FILE_ENCRYPTION].keyExpirationDays,
        rotationDays: TOKEN_KEY_CONFIG[KEY_TYPES.FILE_ENCRYPTION].rotationDays,
        maxConcurrentKeys: 5,
        requiresAsymmetric: true,
        contextBinding: ['timestamp', 'machine', 'app', 'file_context', 'user_id'],
    },

    [KEY_TYPES.DATABASE_ENCRYPTION]: {
        type: KEY_TYPES.DATABASE_ENCRYPTION,
        algorithm: KEY_ALGORITHMS.RS256,
        keySize: 4096,
        expirationDays: TOKEN_KEY_CONFIG[KEY_TYPES.DATABASE_ENCRYPTION].keyExpirationDays,
        rotationDays: TOKEN_KEY_CONFIG[KEY_TYPES.DATABASE_ENCRYPTION].rotationDays,
        maxConcurrentKeys: 6,
        requiresAsymmetric: true,
        contextBinding: ['timestamp', 'machine', 'app', 'db_context', 'schema_version'],
    },

    [KEY_TYPES.SESSION_ENCRYPTION]: {
        type: KEY_TYPES.SESSION_ENCRYPTION,
        algorithm: KEY_ALGORITHMS.HS256,
        expirationDays: TOKEN_KEY_CONFIG[KEY_TYPES.SESSION_ENCRYPTION].keyExpirationDays,
        rotationDays: TOKEN_KEY_CONFIG[KEY_TYPES.SESSION_ENCRYPTION].rotationDays,
        maxConcurrentKeys: 4,
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

// ==================== SIMPLE HELPER ====================

export const getTokenConfig = (keyType: KeyType): TokenKeyConfig => get(TOKEN_KEY_CONFIG, keyType);

// ==================== SIMPLE UTILITIES ====================

/**
 * Simple date helpers
 */
export const DateHelper = {
    DAYS_TO_MS: 24 * 60 * 60 * 1000,

    addDays: (date: Date, days: number) => new Date(date.getTime() + days * DateHelper.DAYS_TO_MS),
    subtractDays: (date: Date, days: number) => new Date(date.getTime() - days * DateHelper.DAYS_TO_MS),
    daysDiff: (date1: Date, date2: Date) => Math.floor((date1.getTime() - date2.getTime()) / DateHelper.DAYS_TO_MS),

    needsRotation: (keyCreatedAt: Date, rotationDays: number) => {
        const rotationThreshold = DateHelper.subtractDays(new Date(), rotationDays);
        return keyCreatedAt < rotationThreshold;
    },

    isExpired: (keyCreatedAt: Date, expirationDays: number) => {
        const expirationDate = DateHelper.addDays(keyCreatedAt, expirationDays);
        return new Date() > expirationDate;
    },
} as const;
