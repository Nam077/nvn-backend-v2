import { DynamicModule, Module, Provider, Type, InjectionToken } from '@nestjs/common';

import Redis from 'ioredis';

import { RedisController } from '@/modules/redis/redis.controller';
import { RedisService } from '@/modules/redis/redis.service';

export interface RedisModuleOptions {
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

export interface RedisModuleAsyncOptions {
    useFactory?: (...args: any[]) => Promise<RedisModuleOptions> | RedisModuleOptions;
    inject?: InjectionToken[];
    imports?: (Type<any> | DynamicModule | Promise<DynamicModule>)[];
}

export const REDIS_MODULE_OPTIONS = 'REDIS_MODULE_OPTIONS';

@Module({})
export class RedisModule {
    static forRoot(options: RedisModuleOptions): DynamicModule {
        const redisOptionsProvider: Provider = {
            provide: REDIS_MODULE_OPTIONS,
            useValue: options,
        };

        const redisServiceProvider: Provider = {
            provide: RedisService,
            useFactory: (redisOptions: RedisModuleOptions) => {
                const client = new Redis({
                    ...redisOptions,
                    lazyConnect: true,
                });

                const subscriber = new Redis({
                    ...redisOptions,
                    lazyConnect: true,
                });

                return new RedisService(client, subscriber);
            },
            inject: [REDIS_MODULE_OPTIONS],
        };

        return {
            module: RedisModule,
            global: true,
            controllers: [RedisController],
            providers: [redisOptionsProvider, redisServiceProvider],
            exports: [RedisService],
        };
    }

    static forRootAsync(options: RedisModuleAsyncOptions): DynamicModule {
        const redisOptionsProvider: Provider = {
            provide: REDIS_MODULE_OPTIONS,
            useFactory: options.useFactory,
            inject: options.inject || [],
        };

        const redisServiceProvider: Provider = {
            provide: RedisService,
            useFactory: (redisOptions: RedisModuleOptions) => {
                const client = new Redis({
                    ...redisOptions,
                    lazyConnect: true,
                });

                const subscriber = new Redis({
                    ...redisOptions,
                    lazyConnect: true,
                });

                return new RedisService(client, subscriber);
            },
            inject: [REDIS_MODULE_OPTIONS],
        };

        return {
            module: RedisModule,
            global: true,
            imports: options.imports || [],
            controllers: [RedisController],
            providers: [redisOptionsProvider, redisServiceProvider],
            exports: [RedisService],
        };
    }
}
