/**
 * Subscription status constants
 */
export const SUBSCRIPTION_STATUS = {
    ACTIVE: 'active',
    EXPIRED: 'expired',
    CANCELLED: 'cancelled',
    PENDING: 'pending',
    FAILED: 'failed',
} as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

/**
 * Payment status constants (for cache management)
 */
export const PAYMENT_STATUS = {
    PENDING: 'pending',
    FAILED: 'failed',
    SUCCESS: 'success',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

/**
 * Subscription features for different user types
 */
export const SUBSCRIPTION_FEATURES = {
    FREE: {
        canDownloadPremiumFonts: false,
        hasDownloadDelay: true,
        downloadDelaySeconds: 15,
        downloadLimitPerDay: 10,
        maxDownloadHistory: 5,
    },
    VIP: {
        canDownloadPremiumFonts: true,
        hasDownloadDelay: false,
        downloadDelaySeconds: 0,
        downloadLimitPerDay: -1, // unlimited
        maxDownloadHistory: -1, // unlimited
    },
} as const;

export type SubscriptionFeatureType = keyof typeof SUBSCRIPTION_FEATURES;

export const getUserFeatures = (
    isVip: boolean,
): typeof SUBSCRIPTION_FEATURES.FREE | typeof SUBSCRIPTION_FEATURES.VIP =>
    isVip ? SUBSCRIPTION_FEATURES.VIP : SUBSCRIPTION_FEATURES.FREE;

export const canDownloadPremiumFonts = (isVip: boolean): boolean => getUserFeatures(isVip).canDownloadPremiumFonts;

export const hasDownloadDelay = (isVip: boolean): boolean => getUserFeatures(isVip).hasDownloadDelay;

export const getDownloadDelay = (isVip: boolean): number => getUserFeatures(isVip).downloadDelaySeconds;
