import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import { Op } from 'sequelize';

import { QueryConfig } from '@/modules/query-configs/entities/query-config.entity';
import { RedisService } from '@/modules/redis/redis.service';

@Injectable()
export class QueryConfigLoaderService {
    constructor(
        @InjectModel(QueryConfig)
        private readonly queryConfigModel: typeof QueryConfig,
        @Inject(RedisService) private readonly redisService: RedisService,
    ) {}

    public getCacheKey(key: string, userId: string | null): string {
        return `query-config:${key}:${userId || 'system'}`;
    }

    public async invalidateCache(key: string, userId: string | null): Promise<void> {
        const cacheKey = this.getCacheKey(key, userId);
        await this.redisService.del(cacheKey);
    }

    async findConfigForKey(key: string, userId: string | null): Promise<Record<string, any>> {
        const userCacheKey = this.getCacheKey(key, userId);
        const systemCacheKey = this.getCacheKey(key, null);

        // 1. Check user-specific cache
        if (userId) {
            const cachedValue = await this.redisService.get(userCacheKey);
            if (cachedValue) return JSON.parse(cachedValue) as Record<string, any>;
        }

        // 2. Check system-default cache
        const cachedSystemValue = await this.redisService.get(systemCacheKey);
        const cachedSystemConfig = cachedSystemValue ? (JSON.parse(cachedSystemValue) as Record<string, any>) : null;

        if (cachedSystemConfig && !userId) {
            return cachedSystemConfig;
        }

        // 3. Database lookup (user-specific and system default in one query)
        const configs = await this.queryConfigModel.findAll({
            where: {
                key,
                userId: userId ? { [Op.in]: [userId, null] } : null,
            },
            order: [['userId', 'DESC']], // Prioritize user-specific over system (null)
        });

        const userConfig = configs.find((c) => c.userId === userId);
        const systemConfig = configs.find((c) => c.userId === null);

        if (userConfig) {
            await this.redisService.set(userCacheKey, JSON.stringify(userConfig.value));
            return userConfig.value;
        }

        if (systemConfig) {
            await this.redisService.set(systemCacheKey, JSON.stringify(systemConfig.value));
            return systemConfig.value;
        }

        // 4. Use cached system config if user-specific db lookup failed
        if (cachedSystemConfig) {
            return cachedSystemConfig;
        }

        // 5. If nothing found, throw.
        throw new NotFoundException(`Configuration with key "${key}" not found in DB or cache.`);
    }
}
