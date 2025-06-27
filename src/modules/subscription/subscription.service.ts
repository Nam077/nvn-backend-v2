import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import { DateUtils } from '@/common';
import { RedisService } from '@/modules/redis/redis.service';
import { User } from '@/modules/users/entities/user.entity';

import { SUBSCRIPTION_STATUS } from './constants/subscription.constants';
import { CreateSubscriptionDurationDto } from './dto/create-subscription-duration.dto';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { CreateUserSubscriptionDto, CreateUserSubscriptionInternalDto } from './dto/create-user-subscription.dto';
import { SubscriptionDuration } from './entities/subscription-duration.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { UserSubscription } from './entities/user-subscription.entity';

@Injectable()
export class SubscriptionService {
    constructor(
        @InjectModel(SubscriptionPlan)
        private readonly subscriptionPlanModel: typeof SubscriptionPlan,
        @InjectModel(SubscriptionDuration)
        private readonly subscriptionDurationModel: typeof SubscriptionDuration,
        @InjectModel(UserSubscription)
        private readonly userSubscriptionModel: typeof UserSubscription,
        private readonly redisService: RedisService,
    ) {}

    // ==================== SUBSCRIPTION PLANS ====================

    async createPlan(createPlanDto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
        // Check if plan with slug already exists
        const existingPlan = await this.subscriptionPlanModel.findOne({
            where: { slug: createPlanDto.slug },
        });

        if (existingPlan) {
            throw new ConflictException('Plan with this slug already exists');
        }

        const plan = await this.subscriptionPlanModel.create(createPlanDto);

        // Cache plan
        await this.redisService.set(`subscription:plan:${plan.id}`, JSON.stringify(plan), {
            ttl: 3600,
        });

        return plan;
    }

    async getActivePlans(): Promise<SubscriptionPlan[]> {
        // Try cache first
        const cacheKey = 'subscription:active-plans';
        const cached = await this.redisService.getJson<SubscriptionPlan[]>(cacheKey);
        if (cached) {
            return cached;
        }

        const plans = await this.subscriptionPlanModel.findAll({
            where: { isActive: true },
            include: [
                {
                    model: SubscriptionDuration,
                    as: 'durations',
                    where: { isActive: true },
                    required: false,
                },
            ],
            order: [['sortOrder', 'ASC']],
        });

        // Cache for 30 minutes
        await this.redisService.set(cacheKey, JSON.stringify(plans), { ttl: 1800 });

        return plans;
    }

    async getPlanById(id: string): Promise<SubscriptionPlan> {
        // Try cache first
        const cached = await this.redisService.getJson<SubscriptionPlan>(`subscription:plan:${id}`);
        if (cached) {
            return cached;
        }

        const plan = await this.subscriptionPlanModel.findByPk(id, {
            include: [
                {
                    model: SubscriptionDuration,
                    as: 'durations',
                    where: { isActive: true },
                    required: false,
                },
            ],
        });

        if (!plan) {
            throw new NotFoundException('Subscription plan not found');
        }

        // Cache plan
        await this.redisService.set(`subscription:plan:${id}`, JSON.stringify(plan), {
            ttl: 3600,
        });

        return plan;
    }

    // ==================== SUBSCRIPTION DURATIONS ====================

    async createDuration(createDurationDto: CreateSubscriptionDurationDto): Promise<SubscriptionDuration> {
        // Verify plan exists
        await this.getPlanById(createDurationDto.planId);

        const duration = await this.subscriptionDurationModel.create(createDurationDto);

        // Clear plans cache since durations changed
        await this.redisService.del('subscription:active-plans');
        await this.redisService.del(`subscription:plan:${createDurationDto.planId}`);

        return duration;
    }

    async getDurationById(id: string): Promise<SubscriptionDuration> {
        const duration = await this.subscriptionDurationModel.findByPk(id, {
            include: [
                {
                    model: SubscriptionPlan,
                    as: 'plan',
                },
            ],
        });

        if (!duration) {
            throw new NotFoundException('Subscription duration not found');
        }

        return duration;
    }

    // ==================== USER SUBSCRIPTIONS ====================

    async subscribeUser(userId: string, subscriptionDto: CreateUserSubscriptionDto): Promise<UserSubscription> {
        // Get duration details
        const duration = await this.getDurationById(subscriptionDto.durationId);

        // Check if user already has active subscription
        const existingSubscription = await this.getUserActiveSubscription(userId);
        if (existingSubscription) {
            throw new ConflictException('User already has an active subscription');
        }

        // Calculate dates
        const startedAt = DateUtils.nowUtc();
        const expiresAt = DateUtils.addDaysUtc(startedAt, duration.durationDays);

        // Create subscription
        const subscriptionData: CreateUserSubscriptionInternalDto = {
            userId,
            planId: duration.planId,
            durationId: duration.id,
            startedAt,
            expiresAt,
            status: SUBSCRIPTION_STATUS.ACTIVE,
            paidAmount: duration.finalPrice,
            paymentMethod: subscriptionDto.paymentMethod,
            transactionId: subscriptionDto.transactionId,
            autoRenew: subscriptionDto.autoRenew || false,
        };

        const subscription = await this.userSubscriptionModel.create(subscriptionData);

        // Clear user subscription cache
        await this.redisService.del(`subscription:user:${userId}`);

        return this.getUserSubscriptionById(subscription.id);
    }

    async getUserActiveSubscription(userId: string): Promise<UserSubscription | null> {
        // Try cache first
        const cached = await this.redisService.getJson<UserSubscription>(`subscription:user:${userId}`);
        if (cached) {
            return cached;
        }

        const subscription = await this.userSubscriptionModel.findOne({
            where: {
                userId,
                status: SUBSCRIPTION_STATUS.ACTIVE,
            },
            include: [
                {
                    model: SubscriptionPlan,
                    as: 'plan',
                },
                {
                    model: SubscriptionDuration,
                    as: 'duration',
                },
            ],
            order: [['createdAt', 'DESC']],
        });

        if (subscription && subscription.isActive) {
            // Cache for 1 hour
            await this.redisService.set(`subscription:user:${userId}`, JSON.stringify(subscription), {
                ttl: 3600,
            });
            return subscription;
        }

        return null;
    }

    async isUserVip(userId: string): Promise<boolean> {
        const subscription = await this.getUserActiveSubscription(userId);
        return subscription ? subscription.isActive : false;
    }

    async getUserSubscriptionById(id: string): Promise<UserSubscription> {
        const subscription = await this.userSubscriptionModel.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: { exclude: ['password'] },
                },
                {
                    model: SubscriptionPlan,
                    as: 'plan',
                },
                {
                    model: SubscriptionDuration,
                    as: 'duration',
                },
            ],
        });

        if (!subscription) {
            throw new NotFoundException('Subscription not found');
        }

        return subscription;
    }

    async getUserSubscriptionHistory(
        userId: string,
        page = 1,
        limit = 10,
    ): Promise<{
        subscriptions: UserSubscription[];
        total: number;
        totalPages: number;
    }> {
        const offset = (page - 1) * limit;

        const { count, rows } = await this.userSubscriptionModel.findAndCountAll({
            where: { userId },
            include: [
                {
                    model: SubscriptionPlan,
                    as: 'plan',
                },
                {
                    model: SubscriptionDuration,
                    as: 'duration',
                },
            ],
            limit,
            offset,
            order: [['createdAt', 'DESC']],
        });

        return {
            subscriptions: rows,
            total: count,
            totalPages: Math.ceil(count / limit),
        };
    }

    async cancelSubscription(userId: string, subscriptionId: string): Promise<UserSubscription> {
        const subscription = await this.userSubscriptionModel.findOne({
            where: {
                id: subscriptionId,
                userId,
            },
        });

        if (!subscription) {
            throw new NotFoundException('Subscription not found');
        }

        await subscription.update({
            status: SUBSCRIPTION_STATUS.CANCELLED,
            autoRenew: false,
        });

        // Clear cache
        await this.redisService.del(`subscription:user:${userId}`);

        return this.getUserSubscriptionById(subscriptionId);
    }

    async renewSubscription(userId: string, subscriptionId: string): Promise<UserSubscription> {
        const subscription = await this.getUserSubscriptionById(subscriptionId);

        if (subscription.userId !== userId) {
            throw new NotFoundException('Subscription not found');
        }

        const { duration } = subscription;
        const newExpiresAt = DateUtils.addDaysUtc(subscription.expiresAt, duration.durationDays);

        await subscription.update({
            expiresAt: newExpiresAt,
            status: SUBSCRIPTION_STATUS.ACTIVE,
        });

        // Clear cache
        await this.redisService.del(`subscription:user:${userId}`);

        return this.getUserSubscriptionById(subscriptionId);
    }

    // ==================== ADMIN FUNCTIONS ====================

    async getAllSubscriptions(
        page = 1,
        limit = 10,
    ): Promise<{
        subscriptions: UserSubscription[];
        total: number;
        totalPages: number;
    }> {
        const offset = (page - 1) * limit;

        const { count, rows } = await this.userSubscriptionModel.findAndCountAll({
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: { exclude: ['password'] },
                },
                {
                    model: SubscriptionPlan,
                    as: 'plan',
                },
                {
                    model: SubscriptionDuration,
                    as: 'duration',
                },
            ],
            limit,
            offset,
            order: [['createdAt', 'DESC']],
        });

        return {
            subscriptions: rows,
            total: count,
            totalPages: Math.ceil(count / limit),
        };
    }

    async getSubscriptionStats(): Promise<{
        totalSubscriptions: number;
        activeSubscriptions: number;
        expiredSubscriptions: number;
        totalRevenue: number;
    }> {
        const cacheKey = 'subscription:stats';
        const cached = await this.redisService.getJson<{
            totalSubscriptions: number;
            activeSubscriptions: number;
            expiredSubscriptions: number;
            totalRevenue: number;
        }>(cacheKey);
        if (cached) {
            return cached;
        }

        const [totalSubscriptions, activeSubscriptions, expiredSubscriptions, totalRevenue] = await Promise.all([
            this.userSubscriptionModel.count(),
            this.userSubscriptionModel.count({ where: { status: SUBSCRIPTION_STATUS.ACTIVE } }),
            this.userSubscriptionModel.count({ where: { status: SUBSCRIPTION_STATUS.EXPIRED } }),
            this.userSubscriptionModel.sum('paidAmount'),
        ]);

        const stats = {
            totalSubscriptions,
            activeSubscriptions,
            expiredSubscriptions,
            totalRevenue: totalRevenue || 0,
        };

        // Cache for 10 minutes
        await this.redisService.set(cacheKey, JSON.stringify(stats), { ttl: 600 });

        return stats;
    }
}
