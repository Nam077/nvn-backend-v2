import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { forEach } from 'lodash';

import {
    HashSetDto,
    PublishDto,
    PushListDto,
    SetAddDto,
    SetJsonDto,
    SetRedisDto,
    SortedSetAddDto,
} from './dto/redis.dto';
import { RedisService } from './redis.service';

@ApiTags('Redis Test')
@Controller('redis')
export class RedisController {
    constructor(private readonly redisService: RedisService) {}

    @Get('ping')
    @ApiOperation({ summary: 'Test Redis connection' })
    @ApiResponse({ status: 200, description: 'Redis ping response' })
    async ping() {
        const result = await this.redisService.ping();
        return {
            message: 'Redis connection test',
            result,
            connected: this.redisService.isConnected(),
        };
    }

    // ==================== STRING OPERATIONS ====================
    @Post('set/:key')
    @ApiOperation({ summary: 'Set a Redis key-value pair' })
    @ApiResponse({ status: 200, description: 'Key set successfully' })
    async set(@Param('key') key: string, @Body() body: SetRedisDto) {
        await this.redisService.set(key, body.value, { ttl: body.ttl });
        return {
            message: 'Key set successfully',
            key,
            value: body.value,
            ttl: body.ttl,
        };
    }

    @Get('get/:key')
    @ApiOperation({ summary: 'Get a Redis key value' })
    @ApiResponse({ status: 200, description: 'Key value retrieved' })
    async get(@Param('key') key: string) {
        const value = await this.redisService.get(key);
        const ttl = await this.redisService.ttl(key);
        return {
            key,
            value,
            ttl: ttl > 0 ? ttl : null,
            exists: value !== null,
        };
    }

    @Delete('del/:key')
    @ApiOperation({ summary: 'Delete a Redis key' })
    @ApiResponse({ status: 200, description: 'Key deleted' })
    async delete(@Param('key') key: string) {
        const deleted = await this.redisService.del(key);
        return {
            message: deleted > 0 ? 'Key deleted successfully' : 'Key not found',
            key,
            deleted: deleted > 0,
        };
    }

    @Post('json/:key')
    @ApiOperation({ summary: 'Set JSON data in Redis' })
    @ApiResponse({ status: 200, description: 'JSON data set successfully' })
    async setJson(@Param('key') key: string, @Body() body: SetJsonDto) {
        await this.redisService.setJson(key, body.data, body.ttl);
        return {
            message: 'JSON data set successfully',
            key,
            data: body.data,
            ttl: body.ttl,
        };
    }

    @Get('json/:key')
    @ApiOperation({ summary: 'Get JSON data from Redis' })
    @ApiResponse({ status: 200, description: 'JSON data retrieved' })
    async getJson(@Param('key') key: string) {
        const data = await this.redisService.getJson(key);
        const ttl = await this.redisService.ttl(key);
        return {
            key,
            data,
            ttl: ttl > 0 ? ttl : null,
            exists: data !== null,
        };
    }

    @Get('keys')
    @ApiOperation({ summary: 'Get all keys matching pattern' })
    @ApiResponse({ status: 200, description: 'Keys retrieved' })
    async getKeys(@Query('pattern') pattern: string = '*') {
        const keys = await this.redisService.keys(pattern);
        return {
            pattern,
            keys,
            count: keys.length,
        };
    }

    @Post('incr/:key')
    @ApiOperation({ summary: 'Increment a Redis counter' })
    @ApiResponse({ status: 200, description: 'Counter incremented' })
    async increment(@Param('key') key: string, @Query('by') by?: string) {
        const increment = by ? parseInt(by, 10) : 1;
        const result =
            increment === 1 ? await this.redisService.incr(key) : await this.redisService.incrby(key, increment);

        return {
            key,
            increment,
            newValue: result,
        };
    }

    // ==================== LIST OPERATIONS ====================
    @Post('list/:key/push')
    @ApiOperation({ summary: 'Push to Redis list' })
    @ApiResponse({ status: 200, description: 'Items pushed to list' })
    async pushToList(@Param('key') key: string, @Body() body: PushListDto) {
        const length =
            body.direction === 'left'
                ? await this.redisService.lpush(key, ...body.values)
                : await this.redisService.rpush(key, ...body.values);

        return {
            key,
            values: body.values,
            direction: body.direction || 'right',
            newLength: length,
        };
    }

    @Get('list/:key')
    @ApiOperation({ summary: 'Get Redis list items' })
    @ApiResponse({ status: 200, description: 'List items retrieved' })
    async getList(@Param('key') key: string) {
        const items = await this.redisService.lrange(key);
        const length = await this.redisService.llen(key);
        return {
            key,
            items,
            length,
        };
    }

    @Post('list/:key/pop')
    @ApiOperation({ summary: 'Pop from Redis list' })
    @ApiResponse({ status: 200, description: 'Item popped from list' })
    async popFromList(@Param('key') key: string, @Query('direction') direction: 'left' | 'right' = 'right') {
        const item = direction === 'left' ? await this.redisService.lpop(key) : await this.redisService.rpop(key);
        return {
            key,
            direction,
            item,
            popped: item !== null,
        };
    }

    // ==================== HASH OPERATIONS ====================
    @Post('hash/:key')
    @ApiOperation({ summary: 'Set hash fields in Redis' })
    @ApiResponse({ status: 200, description: 'Hash fields set successfully' })
    async setHash(@Param('key') key: string, @Body() body: HashSetDto) {
        await this.redisService.hmset(key, body.fields, body.ttl);
        return {
            message: 'Hash fields set successfully',
            key,
            fields: body.fields,
            ttl: body.ttl,
        };
    }

    @Get('hash/:key')
    @ApiOperation({ summary: 'Get all hash fields from Redis' })
    @ApiResponse({ status: 200, description: 'Hash fields retrieved' })
    async getHash(@Param('key') key: string) {
        const fields = await this.redisService.hgetall(key);
        const length = await this.redisService.hlen(key);
        return {
            key,
            fields,
            length,
            exists: length > 0,
        };
    }

    @Get('hash/:key/:field')
    @ApiOperation({ summary: 'Get specific hash field from Redis' })
    @ApiResponse({ status: 200, description: 'Hash field retrieved' })
    async getHashField(@Param('key') key: string, @Param('field') field: string) {
        const value = await this.redisService.hget(key, field);
        const exists = await this.redisService.hexists(key, field);
        return {
            key,
            field,
            value,
            exists: exists === 1,
        };
    }

    // ==================== SET OPERATIONS ====================
    @Post('set/:key')
    @ApiOperation({ summary: 'Add members to Redis set' })
    @ApiResponse({ status: 200, description: 'Members added to set' })
    async addToSet(@Param('key') key: string, @Body() body: SetAddDto) {
        const added = await this.redisService.sadd(key, ...body.members);
        return {
            key,
            members: body.members,
            added,
            message: `${added} new members added to set`,
        };
    }

    @Get('set/:key')
    @ApiOperation({ summary: 'Get all members from Redis set' })
    @ApiResponse({ status: 200, description: 'Set members retrieved' })
    async getSet(@Param('key') key: string) {
        const members = await this.redisService.smembers(key);
        const count = await this.redisService.scard(key);
        return {
            key,
            members,
            count,
        };
    }

    @Delete('set/:key/member/:member')
    @ApiOperation({ summary: 'Remove member from Redis set' })
    @ApiResponse({ status: 200, description: 'Member removed from set' })
    async removeFromSet(@Param('key') key: string, @Param('member') member: string) {
        const removed = await this.redisService.srem(key, member);
        return {
            key,
            member,
            removed: removed > 0,
            message: removed > 0 ? 'Member removed from set' : 'Member not found in set',
        };
    }

    // ==================== SORTED SET OPERATIONS ====================
    @Post('zset/:key')
    @ApiOperation({ summary: 'Add members to Redis sorted set' })
    @ApiResponse({ status: 200, description: 'Members added to sorted set' })
    async addToSortedSet(@Param('key') key: string, @Body() body: SortedSetAddDto) {
        const args: (string | number)[] = [];
        forEach(body.members, ({ score, member }) => {
            args.push(score, member);
        });
        const added = await this.redisService.zadd(key, ...args);
        return {
            key,
            members: body.members,
            added,
            message: `${added} new members added to sorted set`,
        };
    }

    @Get('zset/:key')
    @ApiOperation({ summary: 'Get all members from Redis sorted set' })
    @ApiResponse({ status: 200, description: 'Sorted set members retrieved' })
    async getSortedSet(@Param('key') key: string, @Query('withScores') withScores?: string) {
        const includeScores = withScores === 'true';
        const members = await this.redisService.zrange(key, { withScores: includeScores });
        const count = await this.redisService.zcard(key);
        return {
            key,
            members,
            count,
            withScores: includeScores,
        };
    }

    @Get('zset/:key/rank/:member')
    @ApiOperation({ summary: 'Get member rank in sorted set' })
    @ApiResponse({ status: 200, description: 'Member rank retrieved' })
    async getSortedSetRank(@Param('key') key: string, @Param('member') member: string) {
        const rank = await this.redisService.zrank(key, member);
        const score = await this.redisService.zscore(key, member);
        return {
            key,
            member,
            rank,
            score,
            exists: rank !== null,
        };
    }

    // ==================== PUB/SUB OPERATIONS ====================
    @Post('publish/:channel')
    @ApiOperation({ summary: 'Publish message to Redis channel' })
    @ApiResponse({ status: 200, description: 'Message published' })
    async publish(@Param('channel') channel: string, @Body() body: PublishDto) {
        const subscribers = await this.redisService.publish(channel, body.message);
        return {
            channel,
            message: body.message,
            subscribers,
            published: true,
        };
    }

    @Post('publish-json/:channel')
    @ApiOperation({ summary: 'Publish JSON message to Redis channel' })
    @ApiResponse({ status: 200, description: 'JSON message published' })
    async publishJson(@Param('channel') channel: string, @Body() body: { data: unknown }) {
        const subscribers = await this.redisService.publishJson(channel, body.data);
        return {
            channel,
            data: body.data,
            subscribers,
            published: true,
        };
    }

    // ==================== UTILITY OPERATIONS ====================
    @Get('exists/:key')
    @ApiOperation({ summary: 'Check if Redis key exists' })
    @ApiResponse({ status: 200, description: 'Key existence checked' })
    async checkExists(@Param('key') key: string) {
        const exists = await this.redisService.exists(key);
        return {
            key,
            exists: exists > 0,
        };
    }

    @Post('expire/:key/:seconds')
    @ApiOperation({ summary: 'Set TTL for Redis key' })
    @ApiResponse({ status: 200, description: 'TTL set for key' })
    async setExpire(@Param('key') key: string, @Param('seconds') seconds: string) {
        const ttl = parseInt(seconds, 10);
        const result = await this.redisService.expire(key, ttl);
        return {
            key,
            seconds: ttl,
            success: result === 1,
            message: result === 1 ? 'TTL set successfully' : 'Key not found',
        };
    }

    @Get('ttl/:key')
    @ApiOperation({ summary: 'Get TTL for Redis key' })
    @ApiResponse({ status: 200, description: 'TTL retrieved' })
    async getTtl(@Param('key') key: string) {
        const ttl = await this.redisService.ttl(key);
        return {
            key,
            ttl,
            // eslint-disable-next-line no-nested-ternary
            status: ttl === -1 ? 'no expiry' : ttl === -2 ? 'key not found' : 'expires in seconds',
        };
    }

    @Delete('flush/db')
    @ApiOperation({ summary: 'Flush current Redis database' })
    @ApiResponse({ status: 200, description: 'Database flushed' })
    async flushDb() {
        await this.redisService.flushdb();
        return {
            message: 'Current database flushed successfully',
            warning: 'All keys in current database have been deleted',
        };
    }
}
