import { Global, Module } from '@nestjs/common';

import { RedisController } from '@/modules/redis/redis.controller';
import { RedisService } from '@/modules/redis/redis.service';

@Global()
@Module({
    controllers: [RedisController],
    providers: [RedisService],
    exports: [RedisService],
})
export class RedisModule {}
