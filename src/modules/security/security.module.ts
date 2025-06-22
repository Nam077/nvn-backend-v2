import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { ConfigModule } from '@/modules/config/config.module';
import { RedisModule } from '@/modules/redis/redis.module';

import { SecurityController } from './controllers/security.controller';
import { KeyRotationHistory } from './entities/key-rotation-history.entity';
import { SecurityKey } from './entities/security-key.entity';
import { EnvironmentKeyLoaderService } from './services/environment-key-loader.service';
import { KeyManagerService } from './services/key-manager.service';

@Module({
    imports: [SequelizeModule.forFeature([SecurityKey, KeyRotationHistory]), ConfigModule, RedisModule],
    controllers: [SecurityController],
    providers: [EnvironmentKeyLoaderService, KeyManagerService],
    exports: [EnvironmentKeyLoaderService, KeyManagerService],
})
export class SecurityModule {}
