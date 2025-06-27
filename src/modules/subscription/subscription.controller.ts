import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger';

import { GetUser } from '@/modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { User } from '@/modules/users/entities/user.entity';

import { CreateSubscriptionDurationDto } from './dto/create-subscription-duration.dto';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { CreateUserSubscriptionDto } from './dto/create-user-subscription.dto';
import { SubscriptionDuration } from './entities/subscription-duration.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { UserSubscription } from './entities/user-subscription.entity';
import { SubscriptionService } from './subscription.service';

@ApiTags('Subscription')
@Controller('subscription')
export class SubscriptionController {
    constructor(private readonly subscriptionService: SubscriptionService) {}

    // ==================== PUBLIC ENDPOINTS ====================

    @Get('plans')
    @ApiOperation({ summary: 'Get all active subscription plans' })
    @ApiOkResponse({
        description: 'Active plans retrieved successfully',
        type: [SubscriptionPlan],
    })
    async getActivePlans(): Promise<SubscriptionPlan[]> {
        return this.subscriptionService.getActivePlans();
    }

    @Get('plans/:id')
    @ApiOperation({ summary: 'Get subscription plan by ID' })
    @ApiParam({ name: 'id', description: 'Plan ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ApiOkResponse({
        description: 'Plan retrieved successfully',
        type: SubscriptionPlan,
    })
    async getPlanById(@Param('id') id: string): Promise<SubscriptionPlan> {
        return this.subscriptionService.getPlanById(id);
    }

    // ==================== USER ENDPOINTS ====================

    @Post('subscribe')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Subscribe to a plan' })
    @ApiCreatedResponse({
        description: 'Subscription created successfully',
        type: UserSubscription,
    })
    async subscribeUser(
        @GetUser() user: User,
        @Body(ValidationPipe) subscriptionDto: CreateUserSubscriptionDto,
    ): Promise<UserSubscription> {
        return this.subscriptionService.subscribeUser(user.id, subscriptionDto);
    }

    @Get('my-subscription')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get my active subscription' })
    @ApiOkResponse({
        description: 'Active subscription retrieved successfully',
        type: UserSubscription,
    })
    async getMyActiveSubscription(@GetUser() user: User): Promise<UserSubscription | null> {
        return this.subscriptionService.getUserActiveSubscription(user.id);
    }

    @Get('my-subscription/status')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Check if I have VIP subscription' })
    @ApiOkResponse({
        description: 'VIP status retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                isVip: { type: 'boolean', example: true },
            },
        },
    })
    async getMyVipStatus(@GetUser() user: User): Promise<{ isVip: boolean }> {
        const isVip = await this.subscriptionService.isUserVip(user.id);
        return { isVip };
    }

    @Get('my-subscription/history')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get my subscription history' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 10 })
    @ApiOkResponse({
        description: 'Subscription history retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                subscriptions: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/UserSubscription' },
                },
                total: { type: 'number', example: 5 },
                totalPages: { type: 'number', example: 1 },
            },
        },
    })
    async getMySubscriptionHistory(
        @GetUser() user: User,
        @Query('page') page = 1,
        @Query('limit') limit = 10,
    ): Promise<{
        subscriptions: UserSubscription[];
        total: number;
        totalPages: number;
    }> {
        return this.subscriptionService.getUserSubscriptionHistory(user.id, +page, +limit);
    }

    @Patch('my-subscription/:id/cancel')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Cancel my subscription' })
    @ApiParam({ name: 'id', description: 'Subscription ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ApiOkResponse({
        description: 'Subscription cancelled successfully',
        type: UserSubscription,
    })
    async cancelMySubscription(@GetUser() user: User, @Param('id') subscriptionId: string): Promise<UserSubscription> {
        return this.subscriptionService.cancelSubscription(user.id, subscriptionId);
    }

    @Patch('my-subscription/:id/renew')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Renew my subscription' })
    @ApiParam({ name: 'id', description: 'Subscription ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ApiOkResponse({
        description: 'Subscription renewed successfully',
        type: UserSubscription,
    })
    async renewMySubscription(@GetUser() user: User, @Param('id') subscriptionId: string): Promise<UserSubscription> {
        return this.subscriptionService.renewSubscription(user.id, subscriptionId);
    }

    // ==================== ADMIN ENDPOINTS ====================

    @Post('admin/plans')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create subscription plan (Admin)' })
    @ApiCreatedResponse({
        description: 'Plan created successfully',
        type: SubscriptionPlan,
    })
    async createPlan(@Body(ValidationPipe) createPlanDto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
        return this.subscriptionService.createPlan(createPlanDto);
    }

    @Post('admin/durations')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create subscription duration (Admin)' })
    @ApiCreatedResponse({
        description: 'Duration created successfully',
        type: SubscriptionDuration,
    })
    async createDuration(
        @Body(ValidationPipe) createDurationDto: CreateSubscriptionDurationDto,
    ): Promise<SubscriptionDuration> {
        return this.subscriptionService.createDuration(createDurationDto);
    }

    @Get('admin/subscriptions')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all subscriptions (Admin)' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 10 })
    @ApiOkResponse({
        description: 'Subscriptions retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                subscriptions: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/UserSubscription' },
                },
                total: { type: 'number', example: 100 },
                totalPages: { type: 'number', example: 10 },
            },
        },
    })
    async getAllSubscriptions(
        @Query('page') page = 1,
        @Query('limit') limit = 10,
    ): Promise<{
        subscriptions: UserSubscription[];
        total: number;
        totalPages: number;
    }> {
        return this.subscriptionService.getAllSubscriptions(+page, +limit);
    }

    @Get('admin/subscriptions/:id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get subscription by ID (Admin)' })
    @ApiParam({ name: 'id', description: 'Subscription ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ApiOkResponse({
        description: 'Subscription retrieved successfully',
        type: UserSubscription,
    })
    async getSubscriptionById(@Param('id') id: string): Promise<UserSubscription> {
        return this.subscriptionService.getUserSubscriptionById(id);
    }

    @Get('admin/stats')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get subscription statistics (Admin)' })
    @ApiOkResponse({
        description: 'Statistics retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                totalSubscriptions: { type: 'number', example: 100 },
                activeSubscriptions: { type: 'number', example: 75 },
                expiredSubscriptions: { type: 'number', example: 20 },
                totalRevenue: { type: 'number', example: 10000000 },
            },
        },
    })
    async getSubscriptionStats(): Promise<{
        totalSubscriptions: number;
        activeSubscriptions: number;
        expiredSubscriptions: number;
        totalRevenue: number;
    }> {
        return this.subscriptionService.getSubscriptionStats();
    }

    @Get('admin/users/:userId/subscription')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user subscription (Admin)' })
    @ApiParam({ name: 'userId', description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ApiOkResponse({
        description: 'User subscription retrieved successfully',
        type: UserSubscription,
    })
    async getUserSubscription(@Param('userId') userId: string): Promise<UserSubscription | null> {
        return this.subscriptionService.getUserActiveSubscription(userId);
    }

    @Get('admin/users/:userId/subscription/history')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user subscription history (Admin)' })
    @ApiParam({ name: 'userId', description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 10 })
    @ApiOkResponse({
        description: 'User subscription history retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                subscriptions: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/UserSubscription' },
                },
                total: { type: 'number', example: 5 },
                totalPages: { type: 'number', example: 1 },
            },
        },
    })
    async getUserSubscriptionHistory(
        @Param('userId') userId: string,
        @Query('page') page = 1,
        @Query('limit') limit = 10,
    ): Promise<{
        subscriptions: UserSubscription[];
        total: number;
        totalPages: number;
    }> {
        return this.subscriptionService.getUserSubscriptionHistory(userId, +page, +limit);
    }
}
