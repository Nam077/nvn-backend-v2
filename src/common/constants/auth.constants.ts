/**
 * JWT Configuration Constants
 */
export const JWT_CONFIG = {
    ISSUER: 'nvn-backend',
    AUDIENCE: 'nvn-users',
    ALGORITHM: 'RS256' as const,
} as const;

/**
 * Cookie Configuration Constants
 */
export const COOKIE_CONFIG = {
    REFRESH_TOKEN: {
        NAME: 'nvn_refresh_token',
        OPTIONS: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict' as const,
            path: '/api/auth',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        },
    },
} as const;

/**
 * Cache Key Generation Functions
 */
export const getCacheKey = {
    /**
     * Generate session data cache key
     * @param sessionId - Session ID
     * @returns Cache key for session data
     */
    sessionData: (sessionId: string): string => `nvn:auth:session:${sessionId}`,

    /**
     * Generate user sessions cache key
     * @param userId - User ID
     * @returns Cache key for user sessions set
     */
    userSessions: (userId: string): string => `nvn:auth:user:sessions:${userId}`,

    /**
     * Generate blacklisted session cache key
     * @param sessionId - Session ID
     * @returns Cache key for blacklisted session
     */
    blacklistSession: (sessionId: string): string => `nvn:auth:blacklist:session:${sessionId}`,

    /**
     * Generate blacklisted token cache key
     * @param jti - JWT ID
     * @returns Cache key for blacklisted token
     */
    blacklistToken: (jti: string): string => `nvn:auth:blacklist:token:${jti}`,

    /**
     * Generate rate limit cache key
     * @param identifier - IP address or user ID
     * @returns Cache key for rate limiting
     */
    rateLimit: (identifier: string): string => `nvn:auth:rate:limit:${identifier}`,

    /**
     * Generate login attempts cache key
     * @param identifier - IP address or email
     * @returns Cache key for login attempts tracking
     */
    loginAttempts: (identifier: string): string => `nvn:auth:login:attempts:${identifier}`,
} as const;

/**
 * Token Types
 */
export const TOKEN_TYPES = {
    ACCESS: 'access',
    REFRESH: 'refresh',
} as const;

/**
 * Session Configuration
 */
export const SESSION_CONFIG = {
    DEFAULT_EXPIRY: 30 * 24 * 60 * 60, // 30 days in seconds
    CLEANUP_INTERVAL: 60 * 60, // 1 hour in seconds
} as const;

export const AUTH_TYPE = {
    JWT: 'jwt',
    // In the future, we can add more types here
    // API_KEY: 'apiKey',
    // OAUTH2: 'oauth2',
} as const;

export type AuthType = (typeof AUTH_TYPE)[keyof typeof AUTH_TYPE];
