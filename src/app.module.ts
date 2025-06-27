import { Module } from '@nestjs/common';

import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { AuthModule } from '@/modules/auth/auth.module';
import { CaslModule } from '@/modules/casl/casl.module';
import { ConfigModule } from '@/modules/config/config.module';
import { ConfigServiceApp } from '@/modules/config/config.service';
import { DatabaseModule } from '@/modules/database/database.module';
import { PaymentModule } from '@/modules/payment/payment.module';
import { RedisModule } from '@/modules/redis/redis.module';
import { SecurityModule } from '@/modules/security/security.module';
import { SubscriptionModule } from '@/modules/subscription/subscription.module';
import { UsersModule } from '@/modules/users/users.module';

@Module({
    imports: [
        AuthModule,
        CaslModule,
        ConfigModule,
        DatabaseModule,
        RedisModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigServiceApp) => ({
                host: configService.redisHost,
                port: configService.redisPort,
                password: configService.redisPassword,
                db: configService.redisDb,
                keyPrefix: configService.redisKeyPrefix,
                connectTimeout: 10000,
                commandTimeout: 5000,
                retryDelayOnFailover: 100,
                maxRetriesPerRequest: 3,
            }),
            inject: [ConfigServiceApp],
        }),
        SecurityModule,
        UsersModule,
        SubscriptionModule,
        PaymentModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
