/**
 * VietQR API Utilities
 */

import { toUpper } from 'lodash';

import { generateCompactUuid } from '@/common/utils';

export interface VietQrRequest {
    bankAccount: string; // Số tài khoản
    userBankName: string; // Tên chủ tài khoản
    bankCode: string; // Mã ngân hàng (MB, VCB, TCB...)
    amount: string; // Số tiền (string)
    content: string; // Nội dung chuyển khoản
}

export interface VietQrResponse {
    bankCode: string;
    bankName: string;
    bankAccount: string;
    userBankName: string;
    amount: string;
    content: string;
    qrCode: string; // QR code string (not base64 image)
    imgId: string;
    existing: number;
    transactionId: string;
    transactionRefId: string;
    qrLink: string;
    terminalCode: string;
    subTerminalCode: string | null;
    serviceCode: string | null;
    orderId: string | null;
    additionalData: any[];
}

export const createVietQrRequest = (params: {
    bankAccount: string;
    userBankName: string;
    bankCode: string;
    amount: number;
    content: string;
}): VietQrRequest => ({
    bankAccount: params.bankAccount,
    userBankName: params.userBankName,
    bankCode: toUpper(params.bankCode),
    amount: params.amount.toLocaleString('vi-VN'), // Format với dấu phấy: 5,000
    content: params.content,
});

export const createOrderQrRequest = (params: {
    bankAccount: string;
    userBankName: string;
    bankCode: string;
    amount: number;
    type: string;
}): VietQrRequest => {
    const uuid = generateCompactUuid();
    const content = `${params.type}:${uuid}`;

    return createVietQrRequest({
        bankAccount: params.bankAccount,
        userBankName: params.userBankName,
        bankCode: params.bankCode,
        amount: params.amount,
        content,
    });
};

export const createUserQrRequest = (params: {
    bankAccount: string;
    userBankName: string;
    bankCode: string;
    amount: number;
    userId: string;
    description?: string;
}): VietQrRequest => {
    const uuid = generateCompactUuid();
    const content = params.description
        ? `USER${params.userId} ${uuid} ${params.description}`
        : `USER${params.userId} ${uuid}`;

    return createVietQrRequest({
        bankAccount: params.bankAccount,
        userBankName: params.userBankName,
        bankCode: params.bankCode,
        amount: params.amount,
        content,
    });
};

/**
 * VietQR API configuration
 */
export const VIETQR_CONFIG = {
    API_URL: 'https://api.vietqr.org/vqr/api/qr/generate/unauthenticated',
    DEFAULT_BANK_ACCOUNT: '939256786868',
    DEFAULT_USER_BANK_NAME: 'NGUYEN VAN NAM',
    DEFAULT_BANK_CODE: 'MB',
} as const;
