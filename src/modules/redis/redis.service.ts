import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import Redis, { ChainableCommander } from 'ioredis';
import { forOwn } from 'lodash';

export interface HashSetOptions {
    ttl?: number;
}

export interface ListOptions {
    start?: number;
    end?: number;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private isHealthy = false;

    constructor(
        private readonly client: Redis,
        private readonly subscriber: Redis,
    ) {}

    async onModuleInit(): Promise<void> {
        this.setupEventHandlers();
        await this.connect();
    }

    async onModuleDestroy(): Promise<void> {
        this.isHealthy = false;
        await Promise.all([this.client?.quit(), this.subscriber?.quit()]);
    }

    private setupEventHandlers(): void {
        this.client.on('connect', () => {
            this.logger.log('Redis client connected');
            this.isHealthy = true;
        });

        this.client.on('error', (error) => {
            this.logger.error('Redis client error:', error);
            this.isHealthy = false;
        });

        this.client.on('close', () => {
            this.logger.warn('Redis client connection closed');
            this.isHealthy = false;
        });

        this.subscriber.on('connect', () => {
            this.logger.log('Redis subscriber connected');
        });

        this.subscriber.on('error', (error) => {
            this.logger.error('Redis subscriber error:', error);
        });
    }

    private async connect(): Promise<void> {
        try {
            await Promise.all([this.client.connect(), this.subscriber.connect()]);
            this.logger.log('Redis connections established');
        } catch (error) {
            this.logger.error('Failed to connect to Redis:', error);
            throw error;
        }
    }

    // Health Check
    async ping(): Promise<string> {
        return this.client.ping();
    }

    isConnected(): boolean {
        return this.isHealthy && this.client.status === 'ready';
    }

    // ==================== STRING OPERATIONS ====================
    async get<T = string>(key: string): Promise<T | null> {
        const result = await this.client.get(key);
        return result as T;
    }

    async set(key: string, value: string | number | Buffer, options?: SetOptions): Promise<void> {
        if (options?.ttl && options?.nx) {
            await this.client.set(key, value, 'EX', options.ttl, 'NX');
        } else if (options?.ttl && options?.xx) {
            await this.client.set(key, value, 'EX', options.ttl, 'XX');
        } else if (options?.ttl) {
            await this.client.set(key, value, 'EX', options.ttl);
        } else if (options?.nx) {
            await this.client.set(key, value, 'NX');
        } else if (options?.xx) {
            await this.client.set(key, value, 'XX');
        } else {
            await this.client.set(key, value);
        }
    }

    async setex(key: string, ttl: number, value: string | number): Promise<void> {
        await this.client.setex(key, ttl, value);
    }

    async setnx(key: string, value: string | number): Promise<number> {
        return this.client.setnx(key, value);
    }

    async mget<T = string>(...keys: string[]): Promise<(T | null)[]> {
        return this.client.mget(...keys) as Promise<(T | null)[]>;
    }

    async mset(keyValues: Record<string, string | number>): Promise<void> {
        const args: (string | number)[] = [];
        forOwn(keyValues, (value, key) => {
            args.push(key, value);
        });
        await this.client.mset(...args);
    }

    async incr(key: string): Promise<number> {
        return this.client.incr(key);
    }

    async incrby(key: string, increment: number): Promise<number> {
        return this.client.incrby(key, increment);
    }

    async decr(key: string): Promise<number> {
        return this.client.decr(key);
    }

    async decrby(key: string, decrement: number): Promise<number> {
        return this.client.decrby(key, decrement);
    }

    // ==================== JSON HELPERS ====================
    async getJson<T>(key: string): Promise<T | null> {
        const data = await this.get(key);
        return data ? (JSON.parse(data) as T) : null;
    }

    async setJson<T>(key: string, value: T, ttl?: number): Promise<void> {
        await this.set(key, JSON.stringify(value), { ttl });
    }

    // ==================== KEY OPERATIONS ====================
    async del(...keys: string[]): Promise<number> {
        return this.client.del(...keys);
    }

    async exists(...keys: string[]): Promise<number> {
        return this.client.exists(...keys);
    }

    async expire(key: string, seconds: number): Promise<number> {
        return this.client.expire(key, seconds);
    }

    async ttl(key: string): Promise<number> {
        return this.client.ttl(key);
    }

    async keys(pattern: string): Promise<string[]> {
        return this.client.keys(pattern);
    }

    async scan(cursor: number, pattern?: string, count?: number): Promise<[string, string[]]> {
        if (pattern && count) {
            return this.client.scan(cursor, 'MATCH', pattern, 'COUNT', count);
        } else if (pattern) {
            return this.client.scan(cursor, 'MATCH', pattern);
        } else if (count) {
            return this.client.scan(cursor, 'COUNT', count);
        }
        return this.client.scan(cursor);
    }

    // ==================== HASH OPERATIONS ====================
    async hget(key: string, field: string): Promise<string | null> {
        return this.client.hget(key, field);
    }

    async hset(key: string, field: string, value: string | number, options?: HashSetOptions): Promise<number> {
        const result = await this.client.hset(key, field, value);
        if (options?.ttl) {
            await this.expire(key, options.ttl);
        }
        return result;
    }

    async hmget(key: string, ...fields: string[]): Promise<(string | null)[]> {
        return this.client.hmget(key, ...fields);
    }

    async hmset(key: string, hash: Record<string, string | number>, ttl?: number): Promise<void> {
        await this.client.hmset(key, hash);
        if (ttl) {
            await this.expire(key, ttl);
        }
    }

    async hgetall(key: string): Promise<Record<string, string>> {
        return this.client.hgetall(key);
    }

    async hdel(key: string, ...fields: string[]): Promise<number> {
        return this.client.hdel(key, ...fields);
    }

    async hexists(key: string, field: string): Promise<number> {
        return this.client.hexists(key, field);
    }

    async hkeys(key: string): Promise<string[]> {
        return this.client.hkeys(key);
    }

    async hvals(key: string): Promise<string[]> {
        return this.client.hvals(key);
    }

    async hlen(key: string): Promise<number> {
        return this.client.hlen(key);
    }

    // ==================== LIST OPERATIONS ====================
    async lpush(key: string, ...values: (string | number)[]): Promise<number> {
        return this.client.lpush(key, ...values);
    }

    async rpush(key: string, ...values: (string | number)[]): Promise<number> {
        return this.client.rpush(key, ...values);
    }

    async lpop(key: string): Promise<string | null> {
        return this.client.lpop(key);
    }

    async rpop(key: string): Promise<string | null> {
        return this.client.rpop(key);
    }

    async lrange(key: string, options?: ListOptions): Promise<string[]> {
        const start = options?.start ?? 0;
        const end = options?.end ?? -1;
        return this.client.lrange(key, start, end);
    }

    async llen(key: string): Promise<number> {
        return this.client.llen(key);
    }

    async lindex(key: string, index: number): Promise<string | null> {
        return this.client.lindex(key, index);
    }

    async lset(key: string, index: number, value: string | number): Promise<void> {
        await this.client.lset(key, index, value);
    }

    async ltrim(key: string, start: number, end: number): Promise<void> {
        await this.client.ltrim(key, start, end);
    }

    // ==================== SET OPERATIONS ====================
    async sadd(key: string, ...members: (string | number)[]): Promise<number> {
        return this.client.sadd(key, ...members);
    }

    async srem(key: string, ...members: (string | number)[]): Promise<number> {
        return this.client.srem(key, ...members);
    }

    async smembers(key: string): Promise<string[]> {
        return this.client.smembers(key);
    }

    async sismember(key: string, member: string | number): Promise<number> {
        return this.client.sismember(key, member);
    }

    async scard(key: string): Promise<number> {
        return this.client.scard(key);
    }

    async spop(key: string, count?: number): Promise<string | string[] | null> {
        return count ? this.client.spop(key, count) : this.client.spop(key);
    }

    async srandmember(key: string, count?: number): Promise<string | string[] | null> {
        return count ? this.client.srandmember(key, count) : this.client.srandmember(key);
    }

    // ==================== SORTED SET OPERATIONS ====================
    async zadd(key: string, ...members: (string | number)[]): Promise<number> {
        return this.client.zadd(key, ...members);
    }

    async zrem(key: string, ...members: (string | number)[]): Promise<number> {
        return this.client.zrem(key, ...members);
    }

    async zrange(key: string, options?: SortedSetOptions): Promise<string[]> {
        const start = options?.start ?? 0;
        const end = options?.end ?? -1;

        if (options?.rev) {
            return options?.withScores
                ? this.client.zrevrange(key, start, end, 'WITHSCORES')
                : this.client.zrevrange(key, start, end);
        }
        return options?.withScores
            ? this.client.zrange(key, start, end, 'WITHSCORES')
            : this.client.zrange(key, start, end);
    }

    async zrangebyscore(
        key: string,
        min: number | string,
        max: number | string,
        withScores?: boolean,
    ): Promise<string[]> {
        return withScores
            ? this.client.zrangebyscore(key, min, max, 'WITHSCORES')
            : this.client.zrangebyscore(key, min, max);
    }

    async zcard(key: string): Promise<number> {
        return this.client.zcard(key);
    }

    async zscore(key: string, member: string): Promise<string | null> {
        return this.client.zscore(key, member);
    }

    async zrank(key: string, member: string): Promise<number | null> {
        return this.client.zrank(key, member);
    }

    // ==================== PUB/SUB OPERATIONS ====================
    async publish(channel: string, message: string): Promise<number> {
        return this.client.publish(channel, message);
    }

    async publishJson<T>(channel: string, data: T): Promise<number> {
        return this.publish(channel, JSON.stringify(data));
    }

    async subscribe(channel: string, callback: (message: string, channel: string) => void): Promise<void> {
        this.subscriber.on('message', callback);
        await this.subscriber.subscribe(channel);
    }

    async unsubscribe(channel?: string): Promise<void> {
        await this.subscriber.unsubscribe(channel);
    }

    // ==================== TRANSACTION & PIPELINE ====================
    multi(): ChainableCommander {
        return this.client.multi();
    }

    pipeline(): ChainableCommander {
        return this.client.pipeline();
    }

    // ==================== ADVANCED OPERATIONS ====================
    async eval(script: string, keys: string[], args: (string | number)[]): Promise<any> {
        return this.client.eval(script, keys.length, ...keys, ...args);
    }

    async flushdb(): Promise<void> {
        await this.client.flushdb();
    }

    async flushall(): Promise<void> {
        await this.client.flushall();
    }

    // Raw client access for advanced operations
    getClient(): Redis {
        return this.client;
    }

    getSubscriber(): Redis {
        return this.subscriber;
    }
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
