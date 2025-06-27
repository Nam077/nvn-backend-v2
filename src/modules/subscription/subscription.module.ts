import { Logger, Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { RedisModule } from '@/modules/redis/redis.module';
import { UsersModule } from '@/modules/users/users.module';

import { SubscriptionDuration } from './entities/subscription-duration.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { UserSubscription } from './entities/user-subscription.entity';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';

@Module({
    imports: [
        SequelizeModule.forFeature([SubscriptionPlan, SubscriptionDuration, UserSubscription]),
        RedisModule,
        UsersModule,
    ],
    controllers: [SubscriptionController],
    providers: [SubscriptionService, Logger],
    exports: [SubscriptionService],
})
export class SubscriptionModule {}
