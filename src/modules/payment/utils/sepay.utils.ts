/**
 * SePay QR Code Generation Utilities
 */

import { toUpper, trim } from 'lodash';

import { generateCompactUuid } from '@/common/utils';

export interface SepayQrParams {
    acc: string; // Số tài khoản ngân hàng
    bank: string; // Mã ngân hàng (VD: MB, VCB, TCB...)
    amount: number; // Số tiền
    des: string; // Nội dung chuyển khoản
}

/**
 * Generate SePay QR code URL for bank transfer
 * @param params - QR code parameters
 * @returns QR code image URL
 *
 * @example
 * generateSepayQrUrl({
 *   acc: 'NAM077ZZZ',
 *   bank: 'MB',
 *   amount: 299000,
 *   des: 'ORDER:87d814c87844acf935ecac544b894c1'
 * })
 * // Returns: 'https://qr.sepay.vn/img?acc=NAM077ZZZ&bank=MB&amount=299000&des=ORDER%3A87d814c87844acf935ecac544b894c1'
 */
export const generateSepayQrUrl = (params: SepayQrParams): string => {
    const baseUrl = 'https://qr.sepay.vn/img';

    // Manual encode tất cả params và force encode dấu gạch ngang
    const encodedParams = {
        acc: encodeURIComponent(params.acc),
        bank: encodeURIComponent(toUpper(params.bank)),
        amount: encodeURIComponent(params.amount.toString()),
        des: encodeURIComponent(params.des), // Compact UUID không cần encode dashes
    };

    return `${baseUrl}?acc=${encodedParams.acc}&bank=${encodedParams.bank}&amount=${encodedParams.amount}&des=${encodedParams.des}`;
};

/**
 * Generate SePay QR with order ID in content
 * @param acc - Account number
 * @param bank - Bank code
 * @param amount - Amount in VND
 * @param type - Type of payment (e.g. 'ORDER', 'USER')
 * @returns QR code URL
 */
export const generateOrderQrUrl = (acc: string, bank: string, amount: number, type: string): string => {
    const uuid = generateCompactUuid(); // UUID compact không có dashes
    const content = `${type}:${uuid}`;

    return generateSepayQrUrl({
        acc,
        bank,
        amount,
        des: content,
    });
};

/**
 * Generate SePay QR with user ID in content
 * @param acc - Account number
 * @param bank - Bank code
 * @param amount - Amount in VND
 * @param userId - User ID to include in content
 * @param description - Additional description (optional)
 * @returns QR code URL
 */
export const generateUserQrUrl = (
    acc: string,
    bank: string,
    amount: number,
    userId: string,
    description?: string,
): string => {
    const uuid = generateCompactUuid(); // UUID compact không có dashes
    const content = description ? `USER${userId} ${uuid} ${description}` : `USER${userId} ${uuid}`;

    return generateSepayQrUrl({
        acc,
        bank,
        amount,
        des: content,
    });
};

/**
 * Validate SePay QR parameters
 * @param params - QR parameters to validate
 * @returns Validation result with errors if any
 */
export const validateSepayQrParams = (
    params: SepayQrParams,
): {
    isValid: boolean;
    errors: string[];
} => {
    const errors: string[] = [];

    // Validate account number
    if (!params.acc || trim(params.acc).length === 0) {
        errors.push('Account number is required');
    }

    // Validate bank code
    if (!params.bank || trim(params.bank).length === 0) {
        errors.push('Bank code is required');
    }

    // Validate amount
    if (!params.amount || params.amount <= 0) {
        errors.push('Amount must be greater than 0');
    }

    if (params.amount > 500000000) {
        // 500 million VND limit
        errors.push('Amount exceeds maximum limit (500,000,000 VND)');
    }

    // Validate description
    if (!params.des || trim(params.des).length === 0) {
        errors.push('Description is required');
    }

    if (params.des.length > 255) {
        errors.push('Description exceeds maximum length (255 characters)');
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};
