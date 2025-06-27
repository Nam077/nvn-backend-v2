import { Injectable, Logger, BadRequestException } from '@nestjs/common';

import * as crypto from 'crypto';
import { get, startsWith } from 'lodash';

import { ConfigServiceApp } from '@/modules/config/config.service';
import { SepayWebhookDto } from '@/modules/payment/dto';

import { SEPAY_CONFIG, TRANSFER_TYPES } from './constants';

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);

    constructor(private readonly configService: ConfigServiceApp) {}

    processSepayWebhook(webhookData: SepayWebhookDto, authHeader?: string): void {
        try {
            // Verify webhook API key if auth header is provided
            if (authHeader) {
                const isValid = this.verifyApiKey(authHeader);
                if (!isValid) {
                    throw new BadRequestException('Invalid API key');
                }
            }

            // Log webhook data for debugging
            this.logger.log('Processing SePay webhook', {
                id: webhookData.id,
                gateway: webhookData.gateway,
                transferAmount: webhookData.transferAmount,
                transferType: webhookData.transferType,
                content: webhookData.content,
            });

            // Process based on transfer type
            if (webhookData.transferType === TRANSFER_TYPES.IN) {
                this.handleIncomingPayment(webhookData);
            } else if (webhookData.transferType === TRANSFER_TYPES.OUT) {
                this.handleOutgoingPayment(webhookData);
            } else {
                this.logger.warn(`Unknown transfer type: ${get(webhookData, 'transferType', 'unknown')}`);
            }
        } catch (error) {
            this.logger.error('Error processing SePay webhook', error);
            throw error;
        }
    }

    private verifyApiKey(authHeader: string): boolean {
        try {
            // Extract API key from "Apikey API_KEY_VALUE" format
            if (!startsWith(authHeader, SEPAY_CONFIG.API_KEY_PREFIX)) {
                this.logger.warn('Authorization header does not start with Apikey prefix');
                return false;
            }

            const receivedApiKey = authHeader.substring(SEPAY_CONFIG.API_KEY_PREFIX.length);
            const expectedApiKey = this.configService.sepayApiKey;

            // Use timing-safe comparison to prevent timing attacks
            return crypto.timingSafeEqual(Buffer.from(receivedApiKey), Buffer.from(expectedApiKey));
        } catch (error) {
            this.logger.error('Error verifying API key', error);
            return false;
        }
    }

    private handleIncomingPayment(webhookData: SepayWebhookDto): void {
        this.logger.log(`Incoming payment received: ${webhookData.id}`, {
            amount: webhookData.transferAmount,
            gateway: webhookData.gateway,
            content: webhookData.content,
            referenceCode: webhookData.referenceCode,
        });

        // TODO: Implement incoming payment logic
        // - Parse payment content to identify order/user
        // - Update order status to paid
        // - Send confirmation email
        // - Update user subscription if applicable
        // - Log successful transaction

        // Example: Parse content for order identification
        const orderInfo = this.parsePaymentContent(webhookData.content);
        if (orderInfo) {
            this.logger.log(`Payment linked to order: ${orderInfo}`);
        }
    }

    private handleOutgoingPayment(webhookData: SepayWebhookDto): void {
        this.logger.log(`Outgoing payment detected: ${webhookData.id}`, {
            amount: webhookData.transferAmount,
            gateway: webhookData.gateway,
            content: webhookData.content,
        });

        // TODO: Implement outgoing payment logic
        // - Log outgoing transaction
        // - Update internal accounting if needed
        // - Monitor for refunds or chargebacks
    }

    private parsePaymentContent(content: string): string | null {
        // TODO: Implement content parsing logic based on your payment flow
        // Example: Extract order ID, user ID, or payment code from content
        // This depends on how you structure payment content in your system

        // Example patterns:
        // - "ORDER123" -> extract order ID
        // - "USER456" -> extract user ID
        // - "SUB789" -> extract subscription ID

        const orderMatch = content.match(/ORDER(\d+)/i);
        if (orderMatch) {
            return `ORDER-${orderMatch[1]}`;
        }

        const userMatch = content.match(/USER(\d+)/i);
        if (userMatch) {
            return `USER-${userMatch[1]}`;
        }

        return null;
    }
}
