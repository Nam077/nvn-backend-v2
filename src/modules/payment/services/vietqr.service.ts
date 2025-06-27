import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, BadRequestException } from '@nestjs/common';

import type { AxiosResponse } from 'axios';
import * as QRCode from 'qrcode';
import { firstValueFrom, Observable } from 'rxjs';

import { VietQrRequest, VietQrResponse, VIETQR_CONFIG, createOrderQrRequest } from '../utils/vietqr.utils';

@Injectable()
export class VietQrService {
    private readonly logger = new Logger(VietQrService.name);

    constructor(private readonly httpService: HttpService) {}

    /**
     * Generate QR code using VietQR API
     * @param request - VietQR request parameters
     * @returns VietQR response with QR code
     */
    async generateQrCode(request: VietQrRequest): Promise<VietQrResponse> {
        try {
            this.logger.log('Generating VietQR code', {
                bankAccount: request.bankAccount,
                bankCode: request.bankCode,
                amount: request.amount,
                content: request.content,
            });

            const httpObservable: Observable<AxiosResponse<VietQrResponse>> = this.httpService.post<VietQrResponse>(
                VIETQR_CONFIG.API_URL,
                request,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: '*/*',
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    },
                    timeout: 15000, // 15 seconds timeout
                },
            );

            const response: AxiosResponse<VietQrResponse> = await firstValueFrom(httpObservable);

            // VietQR API trả về direct response, không có code/desc wrapper
            if (!response?.data || !response.data.qrCode) {
                this.logger.error('VietQR API returned invalid response', {
                    status: response?.status,
                    data: response?.data,
                });
                throw new BadRequestException('VietQR API returned invalid response');
            }

            this.logger.log('VietQR code generated successfully', {
                imgId: response.data.imgId,
                qrCodeLength: response.data.qrCode?.length || 0,
            });

            return response.data;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error('Failed to generate VietQR code', {
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
            });

            if (error instanceof BadRequestException) {
                throw error;
            }

            throw new BadRequestException(`Failed to generate QR code: ${errorMessage}`);
        }
    }

    /**
     * Generate QR code for order payment with default bank info
     * @param amount - Payment amount
     * @param type - Payment type (e.g., 'ORDER', 'VIP')
     * @returns VietQR response
     */
    async generateOrderQr(amount: number, type: string = 'ORDER'): Promise<VietQrResponse & { qrImage: string }> {
        const request: VietQrRequest = createOrderQrRequest({
            bankAccount: VIETQR_CONFIG.DEFAULT_BANK_ACCOUNT,
            userBankName: VIETQR_CONFIG.DEFAULT_USER_BANK_NAME,
            bankCode: VIETQR_CONFIG.DEFAULT_BANK_CODE,
            amount,
            type,
        });

        const qrResponse = await this.generateQrCode(request);
        const qrImage = await this.generateQrImage(qrResponse.qrCode);

        return {
            ...qrResponse,
            qrImage,
        };
    }

    /**
     * Convert QR code string to base64 image
     * @param qrCodeString - QR code string from VietQR
     * @returns Base64 image data URL
     */
    async generateQrImage(qrCodeString: string): Promise<string> {
        try {
            this.logger.log('Converting QR string to image', {
                qrLength: qrCodeString.length,
            });

            const qrImage = await QRCode.toDataURL(qrCodeString, {
                errorCorrectionLevel: 'M',
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF',
                },
                width: 256,
            });

            this.logger.log('QR image generated successfully');
            return qrImage;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error('Failed to generate QR image', { error: errorMessage });
            throw new BadRequestException(`Failed to generate QR image: ${errorMessage}`);
        }
    }
}
