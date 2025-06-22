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
