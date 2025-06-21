import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import * as bcrypt from 'bcryptjs';

import { CreateUserDto } from '@/modules/users/dto/create-user.dto';
import { UpdateUserDto } from '@/modules/users/dto/update-user.dto';
import { User } from '@/modules/users/entities/user.entity';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User)
        private readonly userModel: typeof User,
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
        return await this.userModel.create({
            ...createUserDto,
            password: hashedPassword,
        });
    }

    /**
     * Hard delete user
     * @param {string} id - The user ID to delete
     */
    async delete(id: string): Promise<void> {
        const user = await this.findOne(id);
        await user.destroy();
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
        const user = await this.userModel.findByPk(id, {
            attributes: { exclude: ['password'] },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

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
     * Soft delete user (deactivate)
     * @param {string} id - The ID of the user to soft delete
     */
    async remove(id: string): Promise<void> {
        const user = await this.findOne(id);
        await user.update({ isActive: false });
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
}
