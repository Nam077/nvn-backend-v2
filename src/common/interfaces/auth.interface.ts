/**
 * JWT Payload interface for both access and refresh tokens
 */
export interface JwtPayload {
    sub: string; // User ID
    email: string;
    role?: string;
    type: 'access' | 'refresh';
    jti: string; // JWT ID
    sid: string; // Session ID
    iat?: number; // Issued at
    exp?: number; // Expiry time
    iss?: string; // Issuer
    aud?: string; // Audience
}

/**
 * Authenticated user data from JWT guards
 */
export interface AuthenticatedUser {
    id: string;
    email: string;
    role?: string;
    jti: string;
    sid: string;
    keyId?: string;
}

/**
 * User information for token generation
 */
export interface UserInfo {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    isActive: boolean;
    emailVerified: boolean;
}

/**
 * Cached user data (subset of SessionData for CASL and other services)
 */
export interface CachedUserData {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    isActive: boolean;
    emailVerified: boolean;
    permissions: string[];
    roles: Array<{
        id: string;
        name: string;
        displayName?: string;
    }>;
}

/**
 * Session data with user permissions and roles
 */
export interface SessionData {
    sid: string;
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    isActive: boolean;
    emailVerified: boolean;
    permissions: string[];
    roles: Array<{ id: string; name: string; displayName?: string }>;
    accessTokenJti: string;
    refreshTokenJti: string;
    accessTokenExpiry: Date;
    refreshTokenExpiry: Date;
    createdAt: Date;
    userAgent?: string;
    ipAddress?: string;
}

/**
 * Refresh token user data with session information
 */
export interface RefreshTokenUserData {
    id: string;
    email: string;
    role?: string;
    jti: string;
    sid: string;
    refreshToken: string;
    sessionData: SessionData;
}
