import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    ParseUUIDPipe,
    ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { GetUser } from '@/modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { SessionService } from '@/modules/auth/services/session.service';
import { Can, CommonAbilities } from '@/modules/casl/decorators/check-abilities.decorator';
import { AbilityFactory } from '@/modules/casl/factories/ability.factory';
import { CaslGuard } from '@/modules/casl/guards/casl.guard';
import { Subjects } from '@/modules/casl/types/casl.types';

import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../entities/user.entity';
import { RbacService } from '../services/rbac.service';
import { UsersService } from '../users.service';

// 🔧 Fix duplicate string literal
const USER_NOT_FOUND = 'User not found';

@ApiTags('Users (CASL)')
@ApiBearerAuth()
@Controller('users-casl')
@UseGuards(JwtAuthGuard, CaslGuard)
export class UsersCaslController {
    constructor(
        private readonly usersService: UsersService,
        private readonly rbacService: RbacService,
        private readonly abilityFactory: AbilityFactory,
        private readonly sessionService: SessionService,
    ) {}

    // ✅ Only users with 'read User' ability can access
    @Get()
    @CommonAbilities.ReadUsers
    @ApiOperation({ summary: 'Get all users' })
    @ApiResponse({ status: 200, description: 'Users retrieved successfully', type: [User] })
    async findAll(): Promise<{ users: User[]; total: number; totalPages: number }> {
        return this.usersService.findAll();
    }

    // ✅ Users can read own profile, admins can read any profile
    @Get('profile')
    @Can.read(Subjects.User) // Will check conditions in guard based on current user
    @ApiOperation({ summary: 'Get own profile' })
    @ApiResponse({ status: 200, description: 'Profile retrieved successfully', type: User })
    async getProfile(@GetUser('id') userId: string): Promise<User> {
        return this.usersService.findOne(userId);
    }

    // ✅ Only users with 'create User' ability
    @Post()
    @CommonAbilities.CreateUsers
    @ApiOperation({ summary: 'Create new user' })
    @ApiResponse({ status: 201, description: 'User created successfully', type: User })
    async create(@Body() createUserDto: CreateUserDto): Promise<User> {
        return this.usersService.create(createUserDto);
    }

    // ✅ Get specific user - requires read ability
    @Get(':id')
    @CommonAbilities.ReadUsers
    @ApiOperation({ summary: 'Get user by ID' })
    @ApiResponse({ status: 200, description: 'User retrieved successfully', type: User })
    @ApiResponse({ status: 404, description: USER_NOT_FOUND })
    async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
        return this.usersService.findOne(id);
    }

    // ✅ Update user - check if user can update this specific user
    @Put(':id')
    @Can.update(Subjects.User) // 🔥 Now using entity class!
    @ApiOperation({ summary: 'Update user' })
    @ApiResponse({ status: 200, description: 'User updated successfully', type: User })
    @ApiResponse({ status: 404, description: USER_NOT_FOUND })
    async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateUserDto: UpdateUserDto): Promise<User> {
        // Additional check: users can only update themselves unless they're admin
        // This logic can be moved to AbilityFactory for cleaner separation
        return this.usersService.update(id, updateUserDto);
    }

    // ✅ Delete user - only admins or the user themselves
    @Delete(':id')
    @CommonAbilities.DeleteUsers
    @ApiOperation({ summary: 'Delete user' })
    @ApiResponse({ status: 200, description: 'User deleted successfully' })
    @ApiResponse({ status: 404, description: USER_NOT_FOUND })
    async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.usersService.remove(id);
    }

    // ✅ Admin only endpoint - requires manage ability
    @Get('admin/stats')
    @CommonAbilities.ManageUsers
    @ApiOperation({ summary: 'Get user statistics (Admin only)' })
    @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
    async getStats(): Promise<any> {
        return {
            totalUsers: await this.usersService.count(),
            activeUsers: await this.usersService.countActive(),
            // ... more stats
        };
    }

    // ✅ Complex ability - user must NOT have specific ability
    @Post(':id/ban')
    @Can.not('admin', Subjects.System) // Users with system admin cannot be banned
    @CommonAbilities.ManageUsers // But user performing action must be able to manage users
    @ApiOperation({ summary: 'Ban user (cannot ban system admins)' })
    async banUser(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
        // Logic to ban user
        return this.usersService.banUser(id);
    }

    // ✅ Multiple abilities - all must pass
    @Put(':id/promote')
    @Can.all({ action: 'update', subject: Subjects.User }, { action: 'manage', subject: Subjects.Role })
    @ApiOperation({ summary: 'Promote user (requires user update + role management)' })
    async promoteUser(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
        // Logic to promote user
        return this.usersService.promoteUser(id);
    }

    // 🎯 DEMO: Conditions Examples
    @Get('demo/own-profile/:id')
    @Can.read(Subjects.User, { id: 'current_user_id' }) // Dynamic condition
    @ApiOperation({ summary: 'DEMO: Read own profile only (with conditions)' })
    async readOwnProfile(
        @Param('id', ParseUUIDPipe) id: string,
        @GetUser('id') currentUserId: string,
    ): Promise<{ message: string; user?: User }> {
        // This will only work if id === currentUserId due to conditions
        if (id !== currentUserId) {
            throw new ForbiddenException('You can only read your own profile');
        }

        const user = await this.usersService.findOne(id);
        return {
            message: `✅ SUCCESS: User ${currentUserId} can read their own profile`,
            user,
        };
    }

    @Put('demo/update-active-only/:id')
    @Can.update(Subjects.User, { isActive: true }) // Only active users
    @ApiOperation({ summary: 'DEMO: Update only active users (with conditions)' })
    async updateActiveUserOnly(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() updateUserDto: UpdateUserDto,
    ): Promise<{ message: string; user?: User }> {
        const user = await this.usersService.findOne(id);

        if (!user.isActive) {
            throw new ForbiddenException('Can only update active users');
        }

        const updatedUser = await this.usersService.update(id, updateUserDto);
        return {
            message: `✅ SUCCESS: Updated active user ${id}`,
            user: updatedUser,
        };
    }
}
