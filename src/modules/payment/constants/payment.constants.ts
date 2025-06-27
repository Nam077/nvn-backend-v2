export const SEPAY_CONFIG = {
    AUTH_HEADER: 'Authorization',
    API_KEY_PREFIX: 'Apikey ',
} as const;

export const TRANSFER_TYPES = {
    IN: 'in',
    OUT: 'out',
} as const;

export const PAYMENT_STATUS = {
    SUCCESS: 'success',
    FAILED: 'failed',
    PENDING: 'pending',
} as const;
