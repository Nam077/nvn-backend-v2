import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import * as bcrypt from 'bcryptjs';

import { RedisService } from '@/modules/redis/redis.service';
import { CreateUserDto } from '@/modules/users/dto/create-user.dto';
import { UpdateUserDto } from '@/modules/users/dto/update-user.dto';
import { User } from '@/modules/users/entities/user.entity';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User)
        private readonly userModel: typeof User,
        private readonly redisService: RedisService,
    ) {}

    /**
     * Create a new user
     * @param {CreateUserDto} createUserDto - The user data to create
     * @returns {Promise<User>} - The created user
     */
    async create(createUserDto: CreateUserDto): Promise<User> {
        // Check if user already exists
        const existingUser = await this.findByEmail(createUserDto.email);
        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

        // Create user
        const newUser = await this.userModel.create({
            ...createUserDto,
            password: hashedPassword,
        });

        // Cache user sau khi tạo
        await this.redisService.set(`user:${newUser.id}`, JSON.stringify(newUser), {
            ttl: 3600,
        }); // Cache 1 giờ

        return newUser;
    }

    /**
     * Hard delete user
     * @param {string} id - The user ID to delete
     */
    async delete(id: string): Promise<void> {
        const user = await this.findOne(id);
        await user.destroy();

        // Xóa cache
        await this.redisService.del(`user:${id}`);
    }
    /**
     * Find all users with pagination
     * @param {number} page - The page number
     * @param {number} limit - The number of users per page
     * @returns {Promise<{users: User[], total: number, totalPages: number}>} - The users and pagination information
     */
    async findAll(page = 1, limit = 10): Promise<{ users: User[]; total: number; totalPages: number }> {
        const offset = (page - 1) * limit;

        const { count, rows } = await this.userModel.findAndCountAll({
            attributes: { exclude: ['password'] },
            limit,
            offset,
            order: [['createdAt', 'DESC']],
        });

        return {
            users: rows,
            total: count,
            totalPages: Math.ceil(count / limit),
        };
    }

    /**
     * Find user by email
     * @param {string} email - The email to find the user by
     * @returns {Promise<User | null>} - The user if found, otherwise null
     */
    async findByEmail(email: string): Promise<User | null> {
        return this.userModel.findOne({
            where: { email },
        });
    }
    /**
     * Find user by ID
     * @param {string} id - The ID to find the user by
     * @returns {Promise<User>} - The user if found, otherwise throws NotFoundException
     */
    async findOne(id: string): Promise<User> {
        // Kiểm tra cache trước
        const cachedUser = await this.redisService.getJson<User>(`user:${id}`);
        if (cachedUser) {
            return cachedUser;
        }

        const user = await this.userModel.findByPk(id, {
            attributes: { exclude: ['password'] },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Cache user
        await this.redisService.set(`user:${id}`, JSON.stringify(user), {
            ttl: 36,
        });

        return user;
    }

    /**
     * Get user statistics
     * @returns {Promise<{total: number, active: number, inactive: number, verified: number, unverified: number}>} - The user statistics
     */
    async getStats(): Promise<{
        total: number;
        active: number;
        inactive: number;
        verified: number;
        unverified: number;
    }> {
        const [total, active, verified] = await Promise.all([
            this.userModel.count(),
            this.userModel.count({ where: { isActive: true } }),
            this.userModel.count({ where: { emailVerified: true } }),
        ]);

        return {
            total,
            active,
            inactive: total - active,
            verified,
            unverified: total - verified,
        };
    }

    /**
     * Count total users
     * @returns {Promise<number>} - Total number of users
     */
    async count(): Promise<number> {
        return this.userModel.count();
    }

    /**
     * Count active users
     * @returns {Promise<number>} - Number of active users
     */
    async countActive(): Promise<number> {
        return this.userModel.count({ where: { isActive: true } });
    }

    /**
     * Ban user (set isActive to false)
     * @param {string} id - The ID of the user to ban
     * @returns {Promise<User>} - The banned user
     */
    async banUser(id: string): Promise<User> {
        const user = await this.findOne(id);
        await user.update({ isActive: false });

        // Xóa cache
        await this.redisService.del(`user:${id}`);

        return this.findOne(id);
    }

    /**
     * Promote user (example: could upgrade role, here just activates)
     * @param {string} id - The ID of the user to promote
     * @returns {Promise<User>} - The promoted user
     */
    async promoteUser(id: string): Promise<User> {
        const user = await this.findOne(id);
        await user.update({ isActive: true });

        // Xóa cache
        await this.redisService.del(`user:${id}`);

        return this.findOne(id);
    }
    /**
     * Soft delete user (deactivate)
     * @param {string} id - The ID of the user to soft delete
     */
    async remove(id: string): Promise<void> {
        const user = await this.findOne(id);
        await user.update({ isActive: false });

        // Xóa cache
        await this.redisService.del(`user:${id}`);
    }
    /**
     * Update user
     * @param {string} id - The ID of the user to update
     * @param {UpdateUserDto} updateUserDto - The user data to update
     * @returns {Promise<User>} - The updated user
     */
    async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
        const user = await this.findOne(id);

        // If email is being updated, check for conflicts
        if (updateUserDto.email && updateUserDto.email !== user.email) {
            const existingUser = await this.findByEmail(updateUserDto.email);
            if (existingUser) {
                throw new ConflictException('User with this email already exists');
            }
        }

        // If password is being updated, hash it
        if (updateUserDto.password) {
            updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
        }

        await user.update(updateUserDto);

        // Xóa cache cũ
        await this.redisService.del(`user:${id}`);

        // Return updated user without password
        return this.findOne(id);
    }

    /**
     * Validate user password
     * @param {string} email - The email of the user to validate
     * @param {string} password - The password to validate
     * @returns {Promise<User | null>} - The user if the password is valid, otherwise null
     */
    async validatePassword(email: string, password: string): Promise<User | null> {
        const user = await this.findByEmail(email);
        if (!user || !user.isActive) {
            return null;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return null;
        }

        // Update last login
        await user.update({ lastLoginAt: new Date() });

        return user;
    }

    /**
     * Cache user session in Redis
     * @param {string} userId - The user ID
     * @param {string} sessionToken - The session token
     * @param {number} ttl - Time to live in seconds (default: 7 days)
     */
    async cacheUserSession(userId: string, sessionToken: string, ttl = 604800): Promise<void> {
        await this.redisService.set(`session:${sessionToken}`, userId, {
            ttl,
        });
        await this.redisService.set(`user:${userId}:session`, sessionToken, {
            ttl,
        });
    }

    /**
     * Get user ID from session token
     * @param {string} sessionToken - The session token
     * @returns {Promise<string | null>} - The user ID if session exists
     */
    async getUserFromSession(sessionToken: string): Promise<string | null> {
        return await this.redisService.get(`session:${sessionToken}`);
    }

    /**
     * Invalidate user session
     * @param {string} sessionToken - The session token to invalidate
     */
    async invalidateSession(sessionToken: string): Promise<void> {
        const userId = await this.redisService.get(`session:${sessionToken}`);
        if (userId) {
            await this.redisService.del(`session:${sessionToken}`);
            await this.redisService.del(`user:${userId}:session`);
        }
    }

    /**
     * Check rate limit for user actions (VD: login attempts)
     * @param {string} key - The rate limit key (VD: `login:${email}`)
     * @param {number} limit - Maximum number of attempts
     * @param {number} window - Time window in seconds
     * @returns {Promise<{allowed: boolean, remaining: number}>} - The rate limit status
     */
    async checkRateLimit(key: string, limit: number, window: number): Promise<{ allowed: boolean; remaining: number }> {
        const current = await this.redisService.get(key);
        const count = current ? parseInt(current) : 0;

        if (count >= limit) {
            return { allowed: false, remaining: 0 };
        }

        const newCount = count + 1;
        if (count === 0) {
            // Set with expiration
            await this.redisService.set(key, newCount.toString(), {
                ttl: window,
            });
        } else {
            // Increment existing key
            await this.redisService.set(key, newCount.toString());
        }

        return { allowed: true, remaining: limit - newCount };
    }

    /**
     * Cache user stats for performance
     * @returns {Promise<any>} - Cached or fresh user stats
     */
    async getCachedStats(): Promise<any> {
        const cacheKey = 'users:stats';
        const cached = await this.redisService.get(cacheKey);

        if (cached) {
            return JSON.parse(cached);
        }

        const stats = await this.getStats();
        // Cache for 5 minutes
        await this.redisService.set(cacheKey, JSON.stringify(stats), {
            ttl: 300,
        });

        return stats;
    }
}
