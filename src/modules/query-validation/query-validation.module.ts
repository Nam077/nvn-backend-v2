import { Module, Global } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { QueryConfig } from '@/modules/query-configs/entities/query-config.entity';
import { RedisModule } from '@/modules/redis/redis.module';

import { QueryConfigLoaderService } from './services/query-config-loader.service';

@Global()
@Module({
    imports: [SequelizeModule.forFeature([QueryConfig]), RedisModule],
    providers: [QueryConfigLoaderService],
    exports: [QueryConfigLoaderService],
})
export class QueryValidationModule {}
