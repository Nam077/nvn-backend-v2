import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiTags,
} from '@nestjs/swagger';

import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { CreateUserDto } from '@/modules/users/dto/create-user.dto';
import { UpdateUserDto } from '@/modules/users/dto/update-user.dto';
import { User } from '@/modules/users/entities/user.entity';
import { UsersService } from '@/modules/users/users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Post()
    @ApiOperation({ summary: 'Create a new user' })
    @ApiCreatedResponse({
        description: 'User created successfully',
        type: User,
    })
    async create(@Body(ValidationPipe) createUserDto: CreateUserDto): Promise<User> {
        return this.usersService.create(createUserDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Hard delete user (Admin only)' })
    // eslint-disable-next-line sonarjs/no-duplicate-string
    @ApiParam({ name: 'id', description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ApiOkResponse({
        description: 'User deleted successfully',
    })
    async delete(@Param('id') id: string): Promise<{ message: string }> {
        await this.usersService.delete(id);
        return { message: 'User deleted successfully' };
    }
    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all users with pagination' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 10 })
    @ApiOkResponse({
        description: 'Users retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                users: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/User' },
                },
                total: { type: 'number', example: 100 },
                totalPages: { type: 'number', example: 10 },
            },
        },
    })
    async findAll(
        @Query('page') page = 1,
        @Query('limit') limit = 10,
    ): Promise<{ users: User[]; total: number; totalPages: number }> {
        return this.usersService.findAll(+page, +limit);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user by ID' })
    @ApiParam({ name: 'id', description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ApiOkResponse({
        description: 'User retrieved successfully',
        type: User,
    })
    async findOne(@Param('id') id: string): Promise<User> {
        return this.usersService.findOne(id);
    }
    @Get('stats')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user statistics (Admin only)' })
    @ApiOkResponse({
        description: 'User statistics retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                total: { type: 'number', example: 100 },
                active: { type: 'number', example: 85 },
                inactive: { type: 'number', example: 15 },
                verified: { type: 'number', example: 70 },
                unverified: { type: 'number', example: 30 },
            },
        },
    })
    async getStats(): Promise<{
        total: number;
        active: number;
        inactive: number;
        verified: number;
        unverified: number;
    }> {
        return this.usersService.getStats();
    }

    @Delete(':id/soft')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Soft delete user (deactivate)' })
    @ApiParam({ name: 'id', description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ApiOkResponse({
        description: 'User deactivated successfully',
    })
    async remove(@Param('id') id: string): Promise<{ message: string }> {
        await this.usersService.remove(id);
        return { message: 'User deactivated successfully' };
    }
    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update user by ID' })
    @ApiParam({ name: 'id', description: 'User ID', example: '123e4567-e89b-12d3-a456-426614174000' })
    @ApiOkResponse({
        description: 'User updated successfully',
        type: User,
    })
    async update(@Param('id') id: string, @Body(ValidationPipe) updateUserDto: UpdateUserDto): Promise<User> {
        return this.usersService.update(id, updateUserDto);
    }
}
