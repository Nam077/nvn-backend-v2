export const KEY_TYPES = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    EMAIL_VERIFICATION: 'email_verification',
    PASSWORD_RESET: 'password_reset',
    API_KEY: 'api_key',
    WEBHOOK_SIGNATURE: 'webhook_signature',
    FILE_ENCRYPTION: 'file_encryption',
    DATABASE_ENCRYPTION: 'database_encryption',
    SESSION_ENCRYPTION: 'session_encryption',
} as const;

export const KEY_ALGORITHMS = {
    RS256: 'RS256',
    RS384: 'RS384',
    RS512: 'RS512',
    ES256: 'ES256',
    ES384: 'ES384',
    ES512: 'ES512',
    HS256: 'HS256',
    HS384: 'HS384',
    HS512: 'HS512',
} as const;

export const KEY_STATUSES = {
    PENDING: 'pending',
    ACTIVE: 'active',
    ROTATING: 'rotating',
    REVOKED: 'revoked',
    EXPIRED: 'expired',
    COMPROMISED: 'compromised',
} as const;

export type KeyType = (typeof KEY_TYPES)[keyof typeof KEY_TYPES];
export type KeyAlgorithm = (typeof KEY_ALGORITHMS)[keyof typeof KEY_ALGORITHMS];
export type KeyStatus = (typeof KEY_STATUSES)[keyof typeof KEY_STATUSES];

export interface KeyConfiguration {
    type: KeyType;
    algorithm: KeyAlgorithm;
    keySize?: number;
    expirationDays: number;
    rotationDays: number;
    maxConcurrentKeys: number;
    requiresAsymmetric: boolean;
    contextBinding: string[];
}

export interface KeyPairData {
    keyId: string;
    type: KeyType;
    algorithm: KeyAlgorithm;
    publicKey?: string;
    privateKey: string;
    createdAt: Date;
    expiresAt: Date;
    status: KeyStatus;
}

export interface EncryptedKeyRecord {
    keyId: string;
    type: KeyType;
    algorithm: KeyAlgorithm;
    encryptedPrivateKey: string;
    encryptedPublicKey?: string;
    creationTimestamp: number;
    randomSalt: Buffer;
    integritySignature: string;
    status: KeyStatus;
    expiresAt: Date;
    metadata?: Record<string, any>;
}

export interface KeyDerivationContext {
    keyId: string;
    keyType: KeyType;
    creationTimestamp: number;
    randomSalt: Buffer;
}

export interface KeyRotationHistory {
    id: string;
    oldKeyId?: string;
    newKeyId: string;
    keyType: KeyType;
    rotationType: 'scheduled' | 'emergency' | 'manual';
    rotationReason: string;
    rotatedAt: Date;
    rotatedBy?: string;
}
