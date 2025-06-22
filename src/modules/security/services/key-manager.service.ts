import {
    Injectable,
    Logger,
    BadRequestException,
    NotFoundException,
    InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import * as argon2 from 'argon2';
import { randomBytes, generateKeyPairSync, createHmac, pbkdf2Sync, createCipheriv, createDecipheriv } from 'crypto';
import { split, join, startsWith, get } from 'lodash';
import { Op } from 'sequelize';

import { EnvironmentKeyLoaderService } from './environment-key-loader.service';
import { KEY_CONFIGURATIONS, CRYPTO_CONFIG } from '../config/key.config';
import { KeyRotationHistory } from '../entities/key-rotation-history.entity';
import { SecurityKey } from '../entities/security-key.entity';
import { KeyType, KeyAlgorithm, KeyStatus, KEY_STATUSES, KeyDerivationContext } from '../types/key.types';

@Injectable()
export class KeyManagerService {
    private readonly logger = new Logger(KeyManagerService.name);

    /**
     * ZERO-CACHE SECURITY DESIGN:
     * - NEVER cache private keys (obvious security risk)
     * - NEVER cache public keys (key rotation bypass, verification bypass)
     * - NEVER cache metadata (even keyId mappings can be sensitive)
     * - ALWAYS fetch everything fresh from database
     * - Performance trade-off for maximum security
     * - Every key operation is fully validated and fresh
     */

    constructor(
        @InjectModel(SecurityKey)
        private readonly securityKeyModel: typeof SecurityKey,
        @InjectModel(KeyRotationHistory)
        private readonly keyRotationHistoryModel: typeof KeyRotationHistory,
        private readonly envKeyLoader: EnvironmentKeyLoaderService,
    ) {}

    async generateKeyPair(keyType: KeyType, createdBy?: string): Promise<string> {
        const config = get(KEY_CONFIGURATIONS, keyType);
        if (!config) {
            throw new BadRequestException(`Unsupported key type: ${keyType}`);
        }

        this.logger.log(`Generating new ${keyType} key pair...`);

        try {
            // 1. Generate cryptographic key pair
            const { publicKey, privateKey } = this.generateCryptographicKeyPair(
                get(config, 'algorithm'),
                get(config, 'keySize'),
            );

            // 2. Create unique context
            const creationTimestamp = Date.now();
            const randomSalt = randomBytes(32);

            // 3. Generate context-dependent encryption key
            const encryptionKey = await this.generateEncryptionKey({
                keyType,
                creationTimestamp,
                randomSalt,
            });

            // 4. Encrypt keys with context binding
            const encryptedPrivateKey = await this.encryptWithBinding(privateKey, encryptionKey, creationTimestamp);
            const encryptedPublicKey = get(config, 'requiresAsymmetric')
                ? await this.encryptWithBinding(publicKey, encryptionKey, creationTimestamp)
                : undefined;

            // 5. Create integrity signature
            const integritySignature = await this.createIntegritySignature(
                creationTimestamp,
                encryptedPrivateKey,
                encryptedPublicKey || '',
                randomSalt,
            );

            // 6. Store in database
            const expiresAt = new Date(Date.now() + get(config, 'expirationDays', 30) * 24 * 60 * 60 * 1000);

            const newKey = await this.securityKeyModel.create({
                keyType,
                algorithm: get(config, 'algorithm'),
                encryptedPrivateKey,
                encryptedPublicKey,
                creationTimestamp,
                randomSalt,
                integritySignature,
                status: get(KEY_STATUSES, 'PENDING'),
                expiresAt,
                createdBy,
                metadata: {
                    keySize: get(config, 'keySize'),
                    contextBinding: get(config, 'contextBinding'),
                    generatedBy: 'universal',
                },
            });

            // REMOVED: No caching for maximum security

            this.logger.log(`✅ Generated ${keyType} key: ${newKey.keyId}`);
            return newKey.keyId;
        } catch (error) {
            this.logger.error(`Failed to generate ${keyType} key pair:`, error);
            throw new InternalServerErrorException(`Failed to generate ${keyType} key pair`);
        }
    }

    async getPrivateKey(keyId: string): Promise<string> {
        const startTime = Date.now();

        // Always fetch from database for security - NEVER cache private keys
        const keyRecord = await this.securityKeyModel.findOne({
            where: { keyId, status: { [Op.in]: [KEY_STATUSES.ACTIVE, KEY_STATUSES.ROTATING] } },
        });

        if (!keyRecord) {
            throw new NotFoundException(`Active key not found: ${keyId}`);
        }

        // Security validations
        await this.validateKeyAccess(keyRecord);

        // Decrypt private key (always fresh from DB)
        const privateKey = await this.decryptPrivateKey(keyRecord);

        // REMOVED: No caching at all for maximum security

        // Update usage statistics
        await this.updateKeyUsage(keyId);

        const duration = Date.now() - startTime;
        this.logger.debug(`🔑 Retrieved private key from database: ${keyId} (${duration}ms)`);
        return privateKey;
    }

    async getPublicKey(keyId: string): Promise<string | null> {
        const startTime = Date.now();

        // Always fetch from database for security - NEVER cache public keys
        const keyRecord = await this.securityKeyModel.findOne({
            where: { keyId, status: { [Op.in]: [KEY_STATUSES.ACTIVE, KEY_STATUSES.ROTATING] } },
        });

        if (!keyRecord || !keyRecord.encryptedPublicKey) {
            this.logger.debug(`🔍 Public key not found: ${keyId}`);
            return null;
        }

        // Security validations
        await this.validateKeyAccess(keyRecord);

        // Decrypt public key (always fresh from DB)
        const publicKey = await this.decryptPublicKey(keyRecord);

        const duration = Date.now() - startTime;
        this.logger.debug(`🔑 Retrieved public key from database: ${keyId} (${duration}ms)`);
        return publicKey;
    }

    async getActiveKey(keyType: KeyType): Promise<string> {
        // Always fetch from database - NO CACHE for maximum security
        let activeKey = await this.securityKeyModel.findOne({
            where: {
                keyType,
                status: KEY_STATUSES.ACTIVE,
                expiresAt: { [Op.gt]: new Date() },
            },
            order: [['createdAt', 'DESC']],
        });

        // If no active key exists, create a new one
        if (!activeKey) {
            const newKeyId = await this.generateKeyPair(keyType);
            await this.activateKey(newKeyId);

            // Fetch the newly created and activated key
            activeKey = await this.securityKeyModel.findOne({
                where: { keyId: newKeyId },
            });

            if (!activeKey) {
                throw new Error(`Failed to create and retrieve new key for type: ${keyType}`);
            }
        }

        this.logger.debug(`🔍 Retrieved active key from database: ${keyType} -> ${activeKey.keyId}`);
        return activeKey.keyId;
    }

    async activateKey(keyId: string, activatedBy?: string): Promise<void> {
        const keyRecord = await this.securityKeyModel.findOne({ where: { keyId } });
        if (!keyRecord) {
            throw new NotFoundException(`Key not found: ${keyId}`);
        }

        if (keyRecord.status !== KEY_STATUSES.PENDING) {
            throw new BadRequestException(`Key ${keyId} is not in pending status`);
        }

        await keyRecord.update({
            status: KEY_STATUSES.ACTIVE,
            activatedAt: new Date(),
            metadata: {
                ...keyRecord.metadata,
                activatedBy,
            },
        });

        // REMOVED: No cache to clear
        this.logger.log(`✅ Activated key: ${keyId}`);
    }

    async revokeKey(keyId: string, reason: string, revokedBy?: string): Promise<void> {
        const keyRecord = await this.securityKeyModel.findOne({ where: { keyId } });
        if (!keyRecord) {
            throw new NotFoundException(`Key not found: ${keyId}`);
        }

        await keyRecord.update({
            status: KEY_STATUSES.REVOKED,
            revokedAt: new Date(),
            revocationReason: reason,
            metadata: {
                ...keyRecord.metadata,
                revokedBy,
            },
        });

        // REMOVED: No cache to clear

        this.logger.log(`🚫 Revoked key: ${keyId} - Reason: ${reason}`);
    }

    async getKeysByType(
        keyType: KeyType,
        status?: KeyStatus,
        limit = 10,
        offset = 0,
    ): Promise<{ keys: SecurityKey[]; total: number }> {
        const whereClause: Record<string, unknown> = { keyType };
        if (status) {
            whereClause.status = status;
        }

        const { count, rows } = await this.securityKeyModel.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [['createdAt', 'DESC']],
        });

        return { keys: rows, total: count };
    }

    async getKeyStatistics(): Promise<Record<string, Record<string, number>>> {
        // Always fetch fresh from database - NO CACHE
        const rawStats = await this.securityKeyModel.findAll({
            attributes: [
                'keyType',
                'status',
                [this.securityKeyModel.sequelize.fn('COUNT', '*'), 'count'],
                [this.securityKeyModel.sequelize.fn('COUNT', '*'), 'total'],
            ],
            group: ['keyType', 'status'],
            raw: true,
        });

        return this.formatKeyStatistics(
            rawStats as unknown as Array<{ keyType: string; status: string; count: number; total: number }>,
        );
    }

    private generateCryptographicKeyPair(algorithm: KeyAlgorithm, keySize?: number) {
        if (startsWith(algorithm, 'RS')) {
            return generateKeyPairSync('rsa', {
                modulusLength: keySize || 2048,
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
            });
        }

        if (startsWith(algorithm, 'ES')) {
            let curve: string;
            if (algorithm === 'ES256') {
                curve = 'prime256v1';
            } else if (algorithm === 'ES384') {
                curve = 'secp384r1';
            } else {
                curve = 'secp521r1';
            }

            return generateKeyPairSync('ec', {
                namedCurve: curve,
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
            });
        }

        // For symmetric algorithms, generate a random key
        let keyLength: number;
        if (algorithm === 'HS256') {
            keyLength = 32;
        } else if (algorithm === 'HS384') {
            keyLength = 48;
        } else {
            keyLength = 64;
        }

        const symmetricKey = randomBytes(keyLength).toString('hex');
        return { privateKey: symmetricKey, publicKey: '' };
    }

    private async generateEncryptionKey(context: KeyDerivationContext): Promise<Buffer> {
        const envKeys = this.envKeyLoader.getEnvironmentKeys();

        // Multi-layer key derivation with native crypto
        const layer1Input = join(
            [
                envKeys.masterKey,
                context.creationTimestamp.toString(),
                context.keyType,
                context.randomSalt.toString('hex'),
            ],
            '|',
        );

        // Layer 1: PBKDF2 with native crypto
        const layer1Key = pbkdf2Sync(
            layer1Input,
            context.randomSalt,
            CRYPTO_CONFIG.pbkdf2.iterations,
            CRYPTO_CONFIG.pbkdf2.keyLength,
            'sha512',
        );

        // Layer 2: Argon2 for additional security
        const finalKey = await argon2.hash(layer1Key.toString('hex'), {
            salt: context.randomSalt,
            memoryCost: CRYPTO_CONFIG.argon2.memory,
            timeCost: CRYPTO_CONFIG.argon2.time,
            parallelism: CRYPTO_CONFIG.argon2.parallelism,
            hashLength: CRYPTO_CONFIG.argon2.hashLength,
            type: argon2.argon2id,
            raw: true,
        });

        return Buffer.from(finalKey);
    }

    private encryptWithBinding(data: string, key: Buffer, timestamp: number): Promise<string> {
        // Generate random IV for AES-GCM (12 bytes is standard for GCM)
        const iv = randomBytes(12);

        // Additional authenticated data for context binding (without machineId)
        const aad = Buffer.from(`${timestamp}:nvn-backend`, 'utf8');

        // Create cipher for AES-256-GCM
        const cipher = createCipheriv('aes-256-gcm', key, iv);
        cipher.setAAD(aad);

        // Encrypt the data
        let encrypted = cipher.update(data, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);

        // Get the authentication tag
        const authTag = cipher.getAuthTag();

        // Return IV:AuthTag:Ciphertext
        return Promise.resolve(`${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`);
    }

    private decryptWithBinding(encryptedData: string, key: Buffer, timestamp: number): Promise<string> {
        const parts = split(encryptedData, ':');
        const [ivHex, authTagHex, ciphertextHex] = parts;

        // Parse components
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const ciphertext = Buffer.from(ciphertextHex, 'hex');

        // Additional authenticated data for context binding (without machineId)
        const aad = Buffer.from(`${timestamp}:nvn-backend`, 'utf8');

        // Create decipher for AES-256-GCM
        const decipher = createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAAD(aad);
        decipher.setAuthTag(authTag);

        // Decrypt the data
        let decrypted = decipher.update(ciphertext);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return Promise.resolve(decrypted.toString('utf8'));
    }

    private createIntegritySignature(
        timestamp: number,
        encryptedPrivateKey: string,
        encryptedPublicKey: string,
        salt: Buffer,
    ): Promise<string> {
        const envKeys = this.envKeyLoader.getEnvironmentKeys();
        const data = join([timestamp, encryptedPrivateKey, encryptedPublicKey, salt.toString('hex')], ':');

        // Use master key for HMAC (simple approach)
        const signature = createHmac('sha256', envKeys.masterKey).update(data).digest('hex');
        return Promise.resolve(signature);
    }

    private async validateKeyAccess(keyRecord: SecurityKey): Promise<void> {
        if (keyRecord.expiresAt < new Date()) {
            throw new BadRequestException('Key has expired');
        }

        const expectedSignature = await this.createIntegritySignature(
            keyRecord.creationTimestamp,
            keyRecord.encryptedPrivateKey,
            keyRecord.encryptedPublicKey || '',
            keyRecord.randomSalt,
        );

        if (expectedSignature !== keyRecord.integritySignature) {
            throw new InternalServerErrorException('Key integrity check failed');
        }
    }

    private async decryptPrivateKey(keyRecord: SecurityKey): Promise<string> {
        const encryptionKey = await this.generateEncryptionKey({
            keyType: keyRecord.keyType,
            creationTimestamp: keyRecord.creationTimestamp,
            randomSalt: keyRecord.randomSalt,
        });

        return this.decryptWithBinding(keyRecord.encryptedPrivateKey, encryptionKey, keyRecord.creationTimestamp);
    }

    private async decryptPublicKey(keyRecord: SecurityKey): Promise<string> {
        if (!keyRecord.encryptedPublicKey) {
            throw new BadRequestException('No public key available');
        }

        const encryptionKey = await this.generateEncryptionKey({
            keyType: keyRecord.keyType,
            creationTimestamp: keyRecord.creationTimestamp,
            randomSalt: keyRecord.randomSalt,
        });

        return this.decryptWithBinding(keyRecord.encryptedPublicKey, encryptionKey, keyRecord.creationTimestamp);
    }

    // REMOVED: All cache methods for maximum security
    // - cacheKeyInfo: Even metadata can be sensitive
    // - cacheDecryptedKey: Never cache private keys
    // - cacheInMemory: Never cache private keys
    // - clearKeyCache: No cache to clear

    // REMOVED: clearExpiredCache - No longer using memory cache for security
    // REMOVED: getPerformanceMetrics - Unnecessary placeholder method

    private updateKeyUsage(keyId: string): Promise<void> {
        return this.securityKeyModel
            .update(
                {
                    lastUsedAt: new Date(),
                    usageCount: this.securityKeyModel.sequelize.literal('usage_count + 1'),
                },
                { where: { keyId } },
            )
            .then(() => void 0);
    }

    private formatKeyStatistics(
        stats: Array<{ keyType: string; status: string; count: number; total: number }>,
    ): Record<string, Record<string, number>> {
        const result: Record<string, Record<string, number>> = {};

        for (const stat of stats) {
            const { keyType } = stat;
            const { status } = stat;

            // eslint-disable-next-line security/detect-object-injection
            if (!result[keyType]) {
                // eslint-disable-next-line security/detect-object-injection
                result[keyType] = {};
            }

            // eslint-disable-next-line security/detect-object-injection, security/detect-object-injection
            result[keyType][status] = stat.count;
            // eslint-disable-next-line security/detect-object-injection
            result[keyType].total = stat.total;
        }

        return result;
    }
}
