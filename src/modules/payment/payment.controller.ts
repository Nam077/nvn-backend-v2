import {
    Controller,
    Post,
    Body,
    Req,
    Res,
    HttpCode,
    HttpStatus,
    Logger,
    Query,
    Get,
    BadRequestException,
} from '@nestjs/common';

import { Request, Response } from 'express';
import { split } from 'lodash';

import { SepayWebhookDto } from '@/modules/payment/dto';
import { PaymentService } from '@/modules/payment/payment.service';
import { VietQrService } from '@/modules/payment/services/vietqr.service';

import { SEPAY_CONFIG } from './constants';

@Controller()
export class PaymentController {
    private readonly logger = new Logger(PaymentController.name);

    constructor(
        private readonly paymentService: PaymentService,
        private readonly vietQrService: VietQrService,
    ) {}

    @Post('hooks/sepay-payment')
    @HttpCode(HttpStatus.OK)
    sepayWebhook(@Body() webhookData: SepayWebhookDto, @Req() req: Request, @Res() res: Response) {
        try {
            this.logger.log('Received SePay webhook', {
                id: webhookData.id,
                transferType: webhookData.transferType,
                amount: webhookData.transferAmount,
                gateway: webhookData.gateway,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                contentType: req.get('Content-Type'),
            });

            // Verify webhook API key
            const authHeader = req.get(SEPAY_CONFIG.AUTH_HEADER);

            // Process the webhook
            this.paymentService.processSepayWebhook(webhookData, authHeader);

            this.logger.log(`SePay webhook processed successfully for transaction: ${webhookData.id}`);
            res.status(HttpStatus.OK).json({ success: true });
        } catch (error) {
            this.logger.error(`Failed to process SePay webhook for transaction: ${webhookData.id}`, error);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                error: 'Internal server error',
            });
        }
    }

    @Get('qr/generate')
    async generatePaymentQr(
        @Res() res: Response,
        @Query('type') type: string = 'ORDER',
        @Query('amount') amount?: number,
    ) {
        const finalAmount = amount || 5000; // Mặc định 5000 VND

        try {
            const vietQrResponse = await this.vietQrService.generateOrderQr(finalAmount, type);

            this.logger.log('Generated VietQR payment QR', {
                type,
                amount: finalAmount,
                bankAccount: '939256786868',
                bankCode: 'MB',
            });

            const base64Image = split(vietQrResponse.qrImage, ';base64,').pop();
            if (!base64Image) {
                throw new Error('Invalid base64 image data');
            }
            const imageBuffer = Buffer.from(base64Image, 'base64');

            res.setHeader('Content-Type', 'image/png');
            res.send(imageBuffer);
        } catch (error) {
            this.logger.error('Failed to generate VietQR', error);
            // Let NestJS default exception filter handle the response
            throw error;
        }
    }

    @Post('qr/string-to-image')
    async convertQrStringToImage(@Body('qrString') qrString: string) {
        if (!qrString) {
            throw new BadRequestException('QR string is required');
        }

        try {
            const qrImage = await this.vietQrService.generateQrImage(qrString);

            this.logger.log('Converted QR string to image', {
                qrLength: qrString.length,
            });

            return {
                success: true,
                qrString,
                qrImage, // Base64 image data URL
            };
        } catch (error) {
            this.logger.error('Failed to convert QR string to image', error);
            throw error;
        }
    }
}
