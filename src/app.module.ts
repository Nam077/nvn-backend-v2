import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { AuthModule } from '@/modules/auth/auth.module';
import { CaslModule } from '@/modules/casl/casl.module';
import { CategoriesModule } from '@/modules/categories/categories.module';
import { ConfigModule } from '@/modules/config/config.module';
import { ConfigServiceApp } from '@/modules/config/config.service';
import { DatabaseModule } from '@/modules/database/database.module';
import { FontsModule } from '@/modules/fonts/fonts.module';
import { PaymentModule } from '@/modules/payment/payment.module';
import { QueryConfigsModule } from '@/modules/query-configs/query-configs.module';
import { QueryValidationModule } from '@/modules/query-validation/query-validation.module';
import { QueueModule } from '@/modules/queue/queue.module';
import { RedisModule } from '@/modules/redis/redis.module';
import { SecurityModule } from '@/modules/security/security.module';
import { SubscriptionModule } from '@/modules/subscription/subscription.module';
import { TagsModule } from '@/modules/tags/tags.module';
import { TasksModule } from '@/modules/tasks/tasks.module';
import { UsersModule } from '@/modules/users/users.module';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        TasksModule,
        NestConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
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
        FontsModule,
        CategoriesModule,
        TagsModule,
        QueryConfigsModule,
        QueryValidationModule,
        QueueModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        {
            provide: APP_FILTER,
            useClass: HttpExceptionFilter,
        },
    ],
})
export class AppModule {}
