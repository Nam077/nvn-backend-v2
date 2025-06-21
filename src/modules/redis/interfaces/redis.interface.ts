export interface BulkOperationResult {
    success: boolean;
    processed: number;
    failed: string[];
    errors?: Error[];
}

export interface CacheConfig {
    ttl?: number;
    prefix?: string;
}

export interface CacheMetadata {
    key: string;
    value: any;
    ttl?: number;
    createdAt: Date;
    expiresAt?: Date;
}

export interface HashSetOptions {
    ttl?: number;
}

export interface ListOptions {
    start?: number;
    end?: number;
}

// Distributed lock
export interface LockOptions {
    ttl?: number; // seconds
    retries?: number;
    retryDelay?: number; // milliseconds
}

export interface LockResult {
    acquired: boolean;
    lockId?: string;
    expiresAt?: Date;
}

export interface LuaScriptResult<T = any> {
    result: T;
    executionTime: number;
}

// Rate limiting
export interface RateLimitOptions {
    windowSize: number; // seconds
    maxRequests: number;
    keyPrefix?: string;
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    total: number;
}

export interface RedisConfig {
    host: string;
    port: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
    connectTimeout?: number;
    commandTimeout?: number;
    retryDelayOnFailover?: number;
    maxRetriesPerRequest?: number;
}

export interface RedisHealthCheck {
    status: 'healthy' | 'unhealthy';
    uptime: number;
    memory: {
        used: string;
        peak: string;
        percentage: number;
    };
    connections: {
        total: number;
        clients: number;
    };
    keyspace: {
        db0?: {
            keys: number;
            expires: number;
            avgTtl: number;
        };
    };
}

export interface SetOptions {
    ttl?: number;
    nx?: boolean; // Only set if key doesn't exist
    xx?: boolean; // Only set if key exists
}

export interface SortedSetMember {
    score: number;
    value: string;
}

export interface SortedSetOptions {
    withScores?: boolean;
    start?: number;
    end?: number;
    rev?: boolean; // Reverse order
}

export interface StreamMessage {
    id: string;
    timestamp: number;
    data: Record<string, string>;
}

export interface StreamOptions {
    maxLen?: number;
    approximate?: boolean;
    block?: number;
    count?: number;
}
