import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import * as bcrypt from 'bcryptjs';
import { map, omit, size } from 'lodash';
import { CreateOptions, DestroyOptions, FindOptions, UpdateOptions } from 'sequelize';

import { IApiResponse } from '@/common/dto/api.response.dto';
import { IApiPaginatedResponse } from '@/common/dto/paginated.response.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { QueryDto } from '@/common/dto/query.dto';
import { ICrudService } from '@/common/interfaces/crud.interface';
import { QueryBuilder } from '@/common/query-builder/query-utils';
import { FindOneOptions } from '@/common/types/sequelize.types';
import { CreateUserDto } from '@/modules/users/dto/create-user.dto';
import { UpdateUserDto } from '@/modules/users/dto/update-user.dto';
import { UserResponseDto } from '@/modules/users/dto/user.response.dto';
import { User } from '@/modules/users/entities/user.entity';

@Injectable()
export class UsersService implements ICrudService<User, UserResponseDto, CreateUserDto, UpdateUserDto> {
    constructor(
        @InjectModel(User)
        private readonly userModel: typeof User,
    ) {}

    // --- Entity-Returning Methods for Internal Use ---

    async create(createUserDto: CreateUserDto, options?: CreateOptions): Promise<User> {
        const existingUser = await this.findByEmail(createUserDto.email);
        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }
        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
        return this.userModel.create(
            {
                ...createUserDto,
                password: hashedPassword,
            },
            options,
        );
    }

    async findOne(id: string, options?: FindOneOptions): Promise<User> {
        const user = await this.userModel.findByPk(id, options);
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        return user;
    }

    async find(options: FindOptions<User>) {
        return this.userModel.findAll(options);
    }

    async findAll(paginationDto: PaginationDto, queryDto: QueryDto): Promise<{ rows: User[]; total: number }> {
        const { page = 1, limit = 10, q } = paginationDto;
        const { filter, order, select } = queryDto || {};
        const offset = (page - 1) * limit;

        // Helper to create a fully configured builder instance
        const createBuilder = () =>
            new QueryBuilder()
                .setCaseConversion('snake')
                .from('users', 'u')
                .join('INNER', 'user_roles AS ur', 'u.id = ur.user_id')
                .join('INNER', 'roles AS r', 'ur.role_id = r.id');

        const countQueryBuilder = createBuilder().select('COUNT(DISTINCT u.id) as count').where(filter);

        const selectQueryBuilder = createBuilder().select(select).where(filter);

        if (q) {
            const searchQuery = {
                or: [
                    { var: 'email', contains: q },
                    { var: 'firstName', contains: q },
                    { var: 'lastName', contains: q },
                ],
            };
            // When searching, apply to the user table
            selectQueryBuilder.andWhere(searchQuery, { tableAlias: 'u' });
            countQueryBuilder.andWhere(searchQuery, { tableAlias: 'u' });
        }

        if (order && size(order) > 0) {
            selectQueryBuilder.orderByArray(order);
        } else {
            selectQueryBuilder.orderBy('createdAt', 'DESC');
        }

        selectQueryBuilder.limit(limit).offset(offset);

        const { sql: countSql, parameters: countParams } = countQueryBuilder.build();
        const { sql: selectSql, parameters: selectParams } = selectQueryBuilder.build();

        const [results, totalResult] = await Promise.all([
            this.userModel.sequelize.query<User>(selectSql, {
                replacements: selectParams,
                mapToModel: true,
                model: User,
            }),
            this.userModel.sequelize.query(countSql, {
                replacements: countParams,
                plain: true,
            }),
        ]);

        const total = Number((totalResult as { count: string | number })?.count || 0);
        return { rows: results, total };
    }

    async update(id: string, updateUserDto: UpdateUserDto, options?: UpdateOptions): Promise<User> {
        const user = await this.findOne(id);
        if (updateUserDto.email && updateUserDto.email !== user.email) {
            const existingUser = await this.findByEmail(updateUserDto.email);
            if (existingUser && existingUser.id !== id) {
                throw new ConflictException('User with this email already exists');
            }
        }
        return user.update(omit(updateUserDto, ['password']), { transaction: options?.transaction });
    }

    async remove(id: string, options?: DestroyOptions): Promise<void> {
        const user = await this.findOne(id);
        await user.destroy(options);
    }

    // --- API-Facing Methods for Controller Use ---

    async createApi(createUserDto: CreateUserDto): Promise<IApiResponse<UserResponseDto>> {
        const newUser = await this.create(createUserDto);
        return {
            statusCode: 201,
            message: 'User created successfully.',
            data: new UserResponseDto(newUser),
        };
    }

    async findOneApi(id: string): Promise<IApiResponse<UserResponseDto>> {
        const user = await this.findOne(id);
        return {
            statusCode: 200,
            message: 'User retrieved successfully.',
            data: new UserResponseDto(user),
        };
    }

    async findAllApi(
        paginationDto: PaginationDto,
        queryDto: QueryDto,
    ): Promise<IApiPaginatedResponse<UserResponseDto>> {
        const { rows, total } = await this.findAll(paginationDto, queryDto);
        return {
            statusCode: 200,
            message: 'Users retrieved successfully.',
            data: map(rows, (user) => new UserResponseDto(user)),
            paging: {
                page: paginationDto.page,
                limit: paginationDto.limit,
                total,
                totalPages: Math.ceil(total / paginationDto.limit),
            },
        };
    }

    async updateApi(id: string, updateUserDto: UpdateUserDto): Promise<IApiResponse<UserResponseDto>> {
        const updatedUser = await this.update(id, updateUserDto);
        return {
            statusCode: 200,
            message: 'User updated successfully.',
            data: new UserResponseDto(updatedUser),
        };
    }

    async removeApi(id: string): Promise<IApiResponse<null>> {
        await this.remove(id);
        return {
            statusCode: 200,
            message: 'User deleted successfully.',
            data: null,
        };
    }

    // --- Other Business Logic Methods ---

    async findByEmail(email: string): Promise<User | null> {
        return this.userModel.findOne({ where: { email } });
    }

    async validatePassword(email: string, password: string): Promise<User | null> {
        const user = await this.findByEmail(email);
        if (!user || !user.isActive) return null;
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return null;
        return user;
    }

    async count(): Promise<number> {
        return this.userModel.count();
    }

    async countActive(): Promise<number> {
        return this.userModel.count({ where: { isActive: true } });
    }

    async getStats() {
        const [total, active, verified] = await Promise.all([
            this.count(),
            this.countActive(),
            this.userModel.count({ where: { emailVerified: true } }),
        ]);
        return { total, active, inactive: total - active, verified, unverified: total - verified };
    }

    async banUser(id: string): Promise<User> {
        const user = await this.findOne(id);
        return user.update({ isActive: false });
    }

    async promoteUser(id: string): Promise<User> {
        const user = await this.findOne(id);
        return user.update({ isActive: true });
    }
}
