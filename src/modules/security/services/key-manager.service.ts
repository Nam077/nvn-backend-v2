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

import { RedisService } from '@/modules/redis/redis.service';

import { EnvironmentKeyLoaderService } from './environment-key-loader.service';
import { KEY_CONFIGURATIONS, CRYPTO_CONFIG } from '../config/key.config';
import { KeyRotationHistory } from '../entities/key-rotation-history.entity';
import { SecurityKey } from '../entities/security-key.entity';
import { KeyType, KeyAlgorithm, KeyStatus, KEY_STATUSES, KeyDerivationContext } from '../types/key.types';

@Injectable()
export class KeyManagerService {
    private readonly logger = new Logger(KeyManagerService.name);
    private readonly memoryCache = new Map<string, { key: string; expires: number }>();

    constructor(
        @InjectModel(SecurityKey)
        private readonly securityKeyModel: typeof SecurityKey,
        @InjectModel(KeyRotationHistory)
        private readonly keyRotationHistoryModel: typeof KeyRotationHistory,
        private readonly envKeyLoader: EnvironmentKeyLoaderService,
        private readonly redisService: RedisService,
    ) {
        // Auto-clear memory cache every 5 minutes
        setInterval(() => this.clearExpiredCache(), 5 * 60 * 1000);

        this.logger.log('✅ KeyManager initialized');
    }

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
            const keyId = this.generateKeyId(keyType);
            const creationTimestamp = Date.now();
            const randomSalt = randomBytes(32);

            // 3. Generate context-dependent encryption key
            const encryptionKey = await this.generateEncryptionKey({
                keyId,
                keyType,
                creationTimestamp,
                randomSalt,
            });

            // 4. Encrypt keys with context binding
            const encryptedPrivateKey = await this.encryptWithBinding(
                privateKey,
                encryptionKey,
                keyId,
                creationTimestamp,
            );
            const encryptedPublicKey = get(config, 'requiresAsymmetric')
                ? await this.encryptWithBinding(publicKey, encryptionKey, keyId, creationTimestamp)
                : undefined;

            // 5. Create integrity signature
            const integritySignature = await this.createIntegritySignature(
                keyId,
                creationTimestamp,
                encryptedPrivateKey,
                encryptedPublicKey || '',
                randomSalt,
            );

            // 6. Store in database
            const expiresAt = new Date(Date.now() + get(config, 'expirationDays', 30) * 24 * 60 * 60 * 1000);

            await this.securityKeyModel.create({
                keyId,
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

            // 7. Cache public key info in Redis
            await this.cacheKeyInfo(keyId, keyType, get(config, 'algorithm'), !!encryptedPublicKey);

            this.logger.log(`✅ Generated ${keyType} key: ${keyId}`);
            return keyId;
        } catch (error) {
            this.logger.error(`Failed to generate ${keyType} key pair:`, error);
            throw new InternalServerErrorException(`Failed to generate ${keyType} key pair`);
        }
    }

    async getPrivateKey(keyId: string): Promise<string> {
        // 1. Check memory cache first
        const cached = this.memoryCache.get(keyId);
        if (cached && cached.expires > Date.now()) {
            await this.updateKeyUsage(keyId);
            return cached.key;
        }

        // 2. Get from Redis cache
        const redisCached = await this.redisService.get(`security_key:${keyId}`);
        if (redisCached) {
            const keyData = JSON.parse(redisCached) as { privateKey: string };
            const privateKey = get(keyData, 'privateKey');
            if (privateKey) {
                this.cacheInMemory(keyId, privateKey, 5 * 60 * 1000); // 5 minutes
                await this.updateKeyUsage(keyId);
                return privateKey;
            }
        }

        // 3. Get encrypted key from database
        const keyRecord = await this.securityKeyModel.findOne({
            where: { keyId, status: { [Op.in]: [KEY_STATUSES.ACTIVE, KEY_STATUSES.ROTATING] } },
        });

        if (!keyRecord) {
            throw new NotFoundException(`Active key not found: ${keyId}`);
        }

        // 4. Security validations
        await this.validateKeyAccess(keyRecord);

        // 5. Decrypt private key
        const privateKey = await this.decryptPrivateKey(keyRecord);

        // 6. Cache in Redis and memory
        await this.cacheDecryptedKey(keyId, privateKey, keyRecord.keyType);
        this.cacheInMemory(keyId, privateKey, 5 * 60 * 1000);

        // 7. Update usage statistics
        await this.updateKeyUsage(keyId);

        return privateKey;
    }

    async getPublicKey(keyId: string): Promise<string | null> {
        // Check cache first
        const cached = await this.redisService.get(`public_key:${keyId}`);
        if (cached) {
            return cached;
        }

        const keyRecord = await this.securityKeyModel.findOne({
            where: { keyId, status: { [Op.in]: [KEY_STATUSES.ACTIVE, KEY_STATUSES.ROTATING] } },
        });

        if (!keyRecord || !keyRecord.encryptedPublicKey) {
            return null;
        }

        // Decrypt public key
        const publicKey = await this.decryptPublicKey(keyRecord);

        // Cache public key (longer TTL since it's safe to cache)
        await this.redisService.set(`public_key:${keyId}`, publicKey, { ttl: 3600 });

        return publicKey;
    }

    async getActiveKey(keyType: KeyType): Promise<string | null> {
        const cached = await this.redisService.get(`active_key:${keyType}`);
        if (cached) {
            return cached;
        }

        const activeKey = await this.securityKeyModel.findOne({
            where: {
                keyType,
                status: KEY_STATUSES.ACTIVE,
                expiresAt: { [Op.gt]: new Date() },
            },
            order: [['createdAt', 'DESC']],
        });

        if (!activeKey) {
            return null;
        }

        // Cache for 5 minutes
        await this.redisService.set(`active_key:${keyType}`, activeKey.keyId, { ttl: 300 });

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

        await this.clearKeyCache(keyId, keyRecord.keyType);
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

        // Clear all caches
        await this.clearKeyCache(keyId, keyRecord.keyType);
        this.memoryCache.delete(keyId);

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
        const cacheKey = 'key_statistics';
        const cached = await this.redisService.get(cacheKey);

        if (cached) {
            return JSON.parse(cached) as Record<string, Record<string, number>>;
        }

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

        const stats = this.formatKeyStatistics(
            rawStats as unknown as Array<{ keyType: string; status: string; count: number; total: number }>,
        );

        // Cache for 5 minutes
        await this.redisService.set(cacheKey, JSON.stringify(stats), { ttl: 300 });

        return stats;
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

    private generateKeyId(keyType: KeyType): string {
        return `${keyType}_${Date.now()}_${randomBytes(8).toString('hex')}`;
    }

    private async generateEncryptionKey(context: KeyDerivationContext): Promise<Buffer> {
        const envKeys = this.envKeyLoader.getEnvironmentKeys();

        // Multi-layer key derivation with native crypto
        const layer1Input = join(
            [
                envKeys.masterKey,
                context.creationTimestamp.toString(),
                context.keyId,
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

    private encryptWithBinding(data: string, key: Buffer, keyId: string, timestamp: number): Promise<string> {
        // Generate random IV for AES-GCM (12 bytes is standard for GCM)
        const iv = randomBytes(12);

        // Additional authenticated data for context binding (without machineId)
        const aad = Buffer.from(`${keyId}:${timestamp}:nvn-backend`, 'utf8');

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

    private decryptWithBinding(encryptedData: string, key: Buffer, keyId: string, timestamp: number): Promise<string> {
        const parts = split(encryptedData, ':');
        const [ivHex, authTagHex, ciphertextHex] = parts;

        // Parse components
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const ciphertext = Buffer.from(ciphertextHex, 'hex');

        // Additional authenticated data for context binding (without machineId)
        const aad = Buffer.from(`${keyId}:${timestamp}:nvn-backend`, 'utf8');

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
        keyId: string,
        timestamp: number,
        encryptedPrivateKey: string,
        encryptedPublicKey: string,
        salt: Buffer,
    ): Promise<string> {
        const envKeys = this.envKeyLoader.getEnvironmentKeys();
        const data = join([keyId, timestamp, encryptedPrivateKey, encryptedPublicKey, salt.toString('hex')], ':');

        // Use master key for HMAC (simple approach)
        const signature = createHmac('sha256', envKeys.masterKey).update(data).digest('hex');
        return Promise.resolve(signature);
    }

    private async validateKeyAccess(keyRecord: SecurityKey): Promise<void> {
        if (keyRecord.expiresAt < new Date()) {
            throw new BadRequestException('Key has expired');
        }

        const expectedSignature = await this.createIntegritySignature(
            keyRecord.keyId,
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
            keyId: keyRecord.keyId,
            keyType: keyRecord.keyType,
            creationTimestamp: keyRecord.creationTimestamp,
            randomSalt: keyRecord.randomSalt,
        });

        return this.decryptWithBinding(
            keyRecord.encryptedPrivateKey,
            encryptionKey,
            keyRecord.keyId,
            keyRecord.creationTimestamp,
        );
    }

    private async decryptPublicKey(keyRecord: SecurityKey): Promise<string> {
        if (!keyRecord.encryptedPublicKey) {
            throw new BadRequestException('No public key available');
        }

        const encryptionKey = await this.generateEncryptionKey({
            keyId: keyRecord.keyId,
            keyType: keyRecord.keyType,
            creationTimestamp: keyRecord.creationTimestamp,
            randomSalt: keyRecord.randomSalt,
        });

        return this.decryptWithBinding(
            keyRecord.encryptedPublicKey,
            encryptionKey,
            keyRecord.keyId,
            keyRecord.creationTimestamp,
        );
    }

    private async cacheKeyInfo(
        keyId: string,
        keyType: KeyType,
        algorithm: KeyAlgorithm,
        hasPublicKey: boolean,
    ): Promise<void> {
        const keyInfo = {
            keyId,
            keyType,
            algorithm,
            hasPublicKey,
            cachedAt: Date.now(),
        };

        await this.redisService.set(`key_info:${keyId}`, JSON.stringify(keyInfo), { ttl: 3600 });
    }

    private async cacheDecryptedKey(keyId: string, privateKey: string, keyType: KeyType): Promise<void> {
        const keyData = {
            privateKey,
            keyType,
            cachedAt: Date.now(),
        };

        // Cache with shorter TTL for security
        await this.redisService.set(`security_key:${keyId}`, JSON.stringify(keyData), { ttl: 300 });
    }

    private cacheInMemory(keyId: string, privateKey: string, ttl: number): void {
        this.memoryCache.set(keyId, {
            key: privateKey,
            expires: Date.now() + ttl,
        });
    }

    private async clearKeyCache(keyId: string, keyType: KeyType): Promise<void> {
        await Promise.all([
            this.redisService.del(`security_key:${keyId}`),
            this.redisService.del(`public_key:${keyId}`),
            this.redisService.del(`key_info:${keyId}`),
            this.redisService.del(`active_key:${keyType}`),
        ]);
    }

    private clearExpiredCache(): void {
        const now = Date.now();
        for (const [keyId, cached] of this.memoryCache.entries()) {
            if (cached.expires <= now) {
                this.memoryCache.delete(keyId);
            }
        }
    }

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
