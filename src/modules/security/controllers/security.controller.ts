/* eslint-disable*/
import { Controller, Post, Get, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';

import { isEmpty, isString } from 'lodash';

import { DateUtils } from '@/common/utils';
import { KeyManagerService } from '../services/key-manager.service';
import { KeyRotationSchedulerService } from '../services/key-rotation-scheduler.service';
import { KeyType, KeyStatus, RotationStatusData } from '../types/key.types';

@ApiTags('Security')
@Controller('security')
export class SecurityController {
    constructor(
        private readonly keyManagerService: KeyManagerService,
        private readonly keyRotationSchedulerService: KeyRotationSchedulerService,
    ) {}

    @Post('keys/generate')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Generate new key pair' })
    @ApiResponse({ status: 201, description: 'Key pair generated successfully' })
    @ApiResponse({ status: 400, description: 'Invalid key type' })
    async generateKeyPair(@Body() body: { keyType: KeyType; createdBy?: string }) {
        const keyId = await this.keyManagerService.generateKeyPair(body.keyType, body.createdBy);

        return {
            success: true,
            message: `${body.keyType} key pair generated successfully`,
            data: {
                keyId,
                keyType: body.keyType,
                status: 'pending',
                createdBy: body.createdBy || 'system',
            },
        };
    }

    @Post('keys/:keyId/activate')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Activate a pending key' })
    @ApiParam({ name: 'keyId', description: 'Key ID to activate' })
    @ApiResponse({ status: 200, description: 'Key activated successfully' })
    @ApiResponse({ status: 404, description: 'Key not found' })
    async activateKey(@Param('keyId') keyId: string, @Body() body: { activatedBy?: string }) {
        await this.keyManagerService.activateKey(keyId, body.activatedBy);

        return {
            success: true,
            message: 'Key activated successfully',
            data: {
                keyId,
                status: 'active',
                activatedBy: body.activatedBy || 'system',
            },
        };
    }

    @Get('keys/:keyId/private')
    @ApiOperation({ summary: 'Get private key (for testing only)' })
    @ApiParam({ name: 'keyId', description: 'Key ID' })
    @ApiResponse({ status: 200, description: 'Private key retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Key not found' })
    async getPrivateKey(@Param('keyId') keyId: string) {
        const privateKey = await this.keyManagerService.getPrivateKey(keyId);

        return {
            success: true,
            message: 'Private key retrieved successfully',
            data: {
                keyId,
                privateKey: `${privateKey.substring(0, 50)}...`, // Only show first 50 chars for security
                keyLength: privateKey.length,
            },
        };
    }

    @Get('keys/:keyId/public')
    @ApiOperation({ summary: 'Get public key' })
    @ApiParam({ name: 'keyId', description: 'Key ID' })
    @ApiResponse({ status: 200, description: 'Public key retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Key not found or no public key' })
    async getPublicKey(@Param('keyId') keyId: string) {
        const publicKey = await this.keyManagerService.getPublicKey(keyId);

        if (!publicKey) {
            return {
                success: false,
                message: 'No public key available for this key type',
                data: null,
            };
        }

        return {
            success: true,
            message: 'Public key retrieved successfully',
            data: {
                keyId,
                publicKey,
            },
        };
    }

    @Get('keys/active/:keyType')
    @ApiOperation({ summary: 'Get active key for specific type' })
    @ApiParam({
        name: 'keyType',
        description: 'Key type',
        enum: [
            'access_token',
            'refresh_token',
            'email_verification',
            'password_reset',
            'api_key',
            'webhook_signature',
            'file_encryption',
            'database_encryption',
            'session_encryption',
        ],
    })
    @ApiResponse({ status: 200, description: 'Active key retrieved successfully' })
    @ApiResponse({ status: 404, description: 'No active key found' })
    async getActiveKey(@Param('keyType') keyType: KeyType) {
        const activeKeyId = await this.keyManagerService.getActiveKey(keyType);

        if (!activeKeyId) {
            return {
                success: false,
                message: `No active key found for type: ${keyType}`,
                data: null,
            };
        }

        return {
            success: true,
            message: 'Active key retrieved successfully',
            data: {
                keyType,
                activeKeyId,
            },
        };
    }

    @Get('keys')
    @ApiOperation({ summary: 'Get keys by type with filtering' })
    @ApiQuery({
        name: 'keyType',
        required: true,
        enum: [
            'access_token',
            'refresh_token',
            'email_verification',
            'password_reset',
            'api_key',
            'webhook_signature',
            'file_encryption',
            'database_encryption',
            'session_encryption',
        ],
    })
    @ApiQuery({
        name: 'status',
        required: false,
        enum: ['pending', 'active', 'rotating', 'revoked', 'expired', 'compromised'],
    })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of keys to return (default: 10)' })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of keys to skip (default: 0)' })
    @ApiResponse({ status: 200, description: 'Keys retrieved successfully' })
    async getKeysByType(
        @Query('keyType') keyType: KeyType,
        @Query('status') status?: KeyStatus,
        @Query('limit') limit = 10,
        @Query('offset') offset = 0,
    ) {
        const result = await this.keyManagerService.getKeysByType(keyType, status, Number(limit), Number(offset));

        return {
            success: true,
            message: 'Keys retrieved successfully',
            data: {
                keyType,
                status: status || 'all',
                pagination: {
                    limit: Number(limit),
                    offset: Number(offset),
                    total: result.total,
                },
                keys: result.keys.map((key) => ({
                    keyId: key.keyId,
                    keyType: key.keyType,
                    algorithm: key.algorithm,
                    status: key.status,
                    expiresAt: key.expiresAt,
                    createdAt: key.createdAt,
                    activatedAt: key.activatedAt,
                    metadata: key.metadata,
                })),
            },
        };
    }

    @Get('keys/statistics')
    @ApiOperation({ summary: 'Get key statistics' })
    @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
    async getKeyStatistics() {
        const statistics = await this.keyManagerService.getKeyStatistics();

        return {
            success: true,
            message: 'Key statistics retrieved successfully',
            data: {
                statistics,
                summary: {
                    totalKeyTypes: Object.keys(statistics).length,
                    generatedAt: DateUtils.formatForLog(DateUtils.nowUtc()),
                },
            },
        };
    }

    @Post('keys/:keyId/revoke')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Revoke a key' })
    @ApiParam({ name: 'keyId', description: 'Key ID to revoke' })
    @ApiResponse({ status: 200, description: 'Key revoked successfully' })
    @ApiResponse({ status: 404, description: 'Key not found' })
    async revokeKey(@Param('keyId') keyId: string, @Body() body: { reason: string; revokedBy?: string }) {
        await this.keyManagerService.revokeKey(keyId, body.reason, body.revokedBy);

        return {
            success: true,
            message: 'Key revoked successfully',
            data: {
                keyId,
                status: 'revoked',
                reason: body.reason,
                revokedBy: body.revokedBy || 'system',
            },
        };
    }

    @Post('demo/create-access-token-key')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Demo: Create and activate access token key' })
    @ApiResponse({ status: 201, description: 'Access token key created and activated' })
    async demoCreateAccessTokenKey() {
        // 1. Generate key pair
        const keyId = await this.keyManagerService.generateKeyPair('access_token', 'demo-user');

        // 2. Activate key immediately for demo
        await this.keyManagerService.activateKey(keyId, 'demo-user');

        // 3. Get public key
        const publicKey = await this.keyManagerService.getPublicKey(keyId);

        return {
            success: true,
            message: 'Access token key created and activated successfully',
            data: {
                keyId,
                keyType: 'access_token',
                status: 'active',
                publicKey,
                workflow: [
                    '1. Generated key pair',
                    '2. Activated key',
                    '3. Retrieved public key',
                    '4. Ready to use for JWT signing',
                ],
            },
        };
    }

    @Post('demo/full-workflow/:keyType')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Demo: Full key lifecycle workflow' })
    @ApiParam({
        name: 'keyType',
        description: 'Key type for demo',
        enum: [
            'access_token',
            'refresh_token',
            'email_verification',
            'password_reset',
            'api_key',
            'webhook_signature',
            'file_encryption',
            'database_encryption',
            'session_encryption',
        ],
    })
    @ApiResponse({ status: 201, description: 'Full workflow completed' })
    async demoFullWorkflow(@Param('keyType') keyType: KeyType) {
        const workflow = [];

        // 1. Generate key pair
        const keyId = await this.keyManagerService.generateKeyPair(keyType, 'demo-user');
        workflow.push(`✅ Generated ${keyType} key: ${keyId}`);

        // 2. Get key info before activation
        const beforeActivation = await this.keyManagerService.getKeysByType(keyType, 'pending', 1, 0);
        workflow.push(`📋 Found ${beforeActivation.total} pending keys`);

        // 3. Activate key
        await this.keyManagerService.activateKey(keyId, 'demo-user');
        workflow.push(`🔓 Activated key: ${keyId}`);

        // 4. Get active key
        const activeKeyId = await this.keyManagerService.getActiveKey(keyType);
        workflow.push(`🎯 Active key for ${keyType}: ${activeKeyId}`);

        // 5. Test private key retrieval (this will increment usage count)
        const privateKey = await this.keyManagerService.getPrivateKey(keyId);
        workflow.push(`🔑 Retrieved private key (${privateKey.length} chars)`);

        // 6. Get public key if available
        const publicKey = await this.keyManagerService.getPublicKey(keyId);
        if (publicKey) {
            workflow.push(`🔓 Retrieved public key (${publicKey.length} chars)`);
        } else {
            workflow.push(`ℹ️ No public key available for ${keyType}`);
        }

        // 7. Get updated key info
        const afterUsage = await this.keyManagerService.getKeysByType(keyType, 'active', 1, 0);
        const keyInfo = afterUsage.keys[0];

        return {
            success: true,
            message: `Full workflow completed for ${keyType}`,
            data: {
                keyId,
                keyType,
                keyInfo: keyInfo
                    ? {
                          keyId: keyInfo.keyId,
                          status: keyInfo.status,
                          algorithm: keyInfo.algorithm,
                          createdAt: keyInfo.createdAt,
                          activatedAt: keyInfo.activatedAt,
                      }
                    : null,
                workflow,
                publicKey: publicKey ? `${publicKey.substring(0, 100)}...` : null,
            },
        };
    }

    @Get('demo/key-types-overview')
    @ApiOperation({ summary: 'Demo: Overview of all key types and their purposes' })
    @ApiResponse({ status: 200, description: 'Key types overview retrieved' })
    async demoKeyTypesOverview() {
        const keyTypes = {
            access_token: {
                purpose: 'JWT access tokens for API authentication',
                algorithm: 'RS256',
                lifespan: '15 minutes',
                usage: 'Sign/verify user access tokens',
            },
            refresh_token: {
                purpose: 'Long-lived tokens for refreshing access tokens',
                algorithm: 'HS256',
                lifespan: '7 days',
                usage: 'Generate new access tokens',
            },
            email_verification: {
                purpose: 'Email verification tokens',
                algorithm: 'HS256',
                lifespan: '24 hours',
                usage: 'Verify email addresses',
            },
            password_reset: {
                purpose: 'Password reset tokens',
                algorithm: 'HS256',
                lifespan: '1 hour',
                usage: 'Secure password reset flow',
            },
            api_key: {
                purpose: 'API key signing and verification',
                algorithm: 'HS256',
                lifespan: '1 year',
                usage: 'Third-party API access',
            },
            webhook_signature: {
                purpose: 'Webhook payload signing',
                algorithm: 'HS256',
                lifespan: '6 months',
                usage: 'Verify webhook authenticity',
            },
            file_encryption: {
                purpose: 'File encryption/decryption',
                algorithm: 'AES-256-GCM',
                lifespan: '1 year',
                usage: 'Encrypt sensitive files',
            },
            database_encryption: {
                purpose: 'Database field encryption',
                algorithm: 'AES-256-GCM',
                lifespan: '2 years',
                usage: 'Encrypt PII data',
            },
            session_encryption: {
                purpose: 'Session data encryption',
                algorithm: 'AES-256-GCM',
                lifespan: '30 days',
                usage: 'Encrypt session storage',
            },
        };

        return {
            success: true,
            message: 'Key types overview retrieved successfully',
            data: {
                totalKeyTypes: Object.keys(keyTypes).length,
                keyTypes,
                instructions: {
                    generate: 'POST /security/keys/generate',
                    activate: 'POST /security/keys/:keyId/activate',
                    getPrivate: 'GET /security/keys/:keyId/private',
                    getPublic: 'GET /security/keys/:keyId/public',
                    getActive: 'GET /security/keys/active/:keyType',
                    listKeys: 'GET /security/keys?keyType=access_token',
                    statistics: 'GET /security/keys/statistics',
                    revoke: 'POST /security/keys/:keyId/revoke',
                },
            },
        };
    }

    @Post('keys/rotation/:keyType')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Manually rotate keys for specific type' })
    @ApiParam({
        name: 'keyType',
        description: 'Key type to rotate',
        enum: [
            'access_token',
            'refresh_token',
            'email_verification',
            'password_reset',
            'api_key',
            'webhook_signature',
            'file_encryption',
            'database_encryption',
            'session_encryption',
        ],
    })
    @ApiResponse({ status: 200, description: 'Key rotation completed successfully' })
    @ApiResponse({ status: 404, description: 'No active key found for rotation' })
    async rotateKeyType(@Param('keyType') keyType: KeyType, @Body() body: { reason?: string } = {}) {
        const newKeyId = await this.keyRotationSchedulerService.rotateKeyType(keyType);

        return {
            success: true,
            message: `${keyType} key rotation completed successfully`,
            data: {
                keyType,
                newActiveKeyId: newKeyId,
                rotationReason: body.reason || 'manual-rotation',
                rotatedAt: DateUtils.formatForLog(DateUtils.nowUtc()),
            },
        };
    }

    @Get('rotation/status')
    @ApiOperation({ summary: 'Get rotation status for all key types' })
    @ApiResponse({ status: 200, description: 'Rotation status retrieved successfully' })
    async getRotationStatus(): Promise<{
        success: boolean;
        message: string;
        data: Record<string, RotationStatusData | { error: string }>;
    }> {
        const status = await this.keyRotationSchedulerService.getRotationStatus();

        return {
            success: true,
            message: 'Rotation status retrieved successfully',
            data: status,
        };
    }

    @Get('timing/analysis')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get basic rotation status for all keys' })
    @ApiResponse({ status: 200, description: 'Rotation status retrieved successfully' })
    async getTimingAnalysis(): Promise<{
        success: boolean;
        message: string;
        data: Record<string, RotationStatusData | { error: string }>;
    }> {
        const status = await this.keyRotationSchedulerService.getRotationStatus();

        return {
            success: true,
            message: 'Basic rotation status retrieved successfully',
            data: status,
        };
    }

    @Get('keys/:keyId/timing')
    @ApiOperation({ summary: 'Get timing information for a specific key' })
    @ApiParam({ name: 'keyId', description: 'Key ID' })
    @ApiResponse({ status: 200, description: 'Key timing information retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Key not found' })
    async getKeyTiming(@Param('keyId') keyId: string) {
        // Validate input with lodash
        if (isEmpty(keyId) || !isString(keyId)) {
            return {
                success: false,
                message: 'Invalid key ID provided',
                data: null,
            };
        }

        // This would require finding the key first to get its type and creation date
        // For now, return a placeholder response
        return {
            success: false,
            message: 'Key timing analysis endpoint needs implementation with key lookup',
            data: null,
        };
    }

    @Post('rotation/trigger')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Trigger manual key rotation check' })
    @ApiResponse({ status: 200, description: 'Rotation check triggered successfully' })
    async triggerRotationCheck() {
        // Trigger the rotation check manually
        await this.keyRotationSchedulerService.checkKeyRotation();

        return {
            success: true,
            message: 'Manual rotation check completed successfully',
            data: {
                triggeredAt: DateUtils.nowUtc(),
                type: 'manual',
            },
        };
    }
}
