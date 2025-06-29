import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import * as bcrypt from 'bcryptjs';
import { map, omit, values } from 'lodash';
import { CreateOptions, DestroyOptions, FindOptions, UpdateOptions } from 'sequelize';

import { IApiResponse } from '@/common/dto/api.response.dto';
import { IApiPaginatedResponse } from '@/common/dto/paginated.response.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { QueryDto } from '@/common/dto/query.dto';
import { ICrudService } from '@/common/interfaces/crud.interface';
import { JsonLogicRuleNode } from '@/common/query-builder/json-logic-to-sql.builder';
import { QueryBuilder } from '@/common/query-builder/query-utils';
import { FindOneOptions } from '@/common/types/sequelize.types';
import { CreateUserDto } from '@/modules/users/dto/create-user.dto';
import { UpdateUserDto } from '@/modules/users/dto/update-user.dto';
import { UserResponseDto } from '@/modules/users/dto/user.response.dto';
import { User } from '@/modules/users/entities/user.entity';

interface BuildUserQueryOptions {
    filter?: JsonLogicRuleNode;
    select?: string[];
    order?: Array<{ field: string; direction: 1 | -1 }>;
    limit?: number;
    offset?: number;
}

// --- Constants for User Service ---
// Defines the mapping from simple client-facing field names to complex SQL expressions.
const SELECT_FIELD_MAP = {
    id: 'u.id',
    email: 'u.email',
    firstName: 'u."firstName"',
    lastName: 'u."lastName"',
    isActive: 'u."isActive"',
    emailVerified: 'u."emailVerified"',
    createdAt: 'u."createdAt"',
    updatedAt: 'u."updatedAt"',
    permissions: "COALESCE(up.permissions, '[]'::jsonb) as permissions",
    roles: "COALESCE(up.roles, '[]'::jsonb) as roles",
};

// Default select fields are derived from the values of the map.
const DEFAULT_USER_SELECT_FIELDS = values(SELECT_FIELD_MAP);

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

        // Build filter with search query
        let finalFilter = filter;
        if (q) {
            const searchQuery = {
                or: [
                    { contains: [{ var: 'email' }, q] },
                    { contains: [{ var: 'firstName' }, q] },
                    { contains: [{ var: 'lastName' }, q] },
                ],
            };
            finalFilter = finalFilter ? { and: [filter, searchQuery] } : searchQuery;
        }

        // Use CTE-based query for better performance
        const { sql: selectSql, parameters: selectParams } = this._buildUserQuery({
            filter: finalFilter,
            select: select || DEFAULT_USER_SELECT_FIELDS,
            order,
            limit,
            offset,
        });

        const JSONB_FIELD_ALIAS_MAP = {
            roles: 'up',
            permissions: 'up',
        };

        // Create count query using same CTE structure but with COUNT
        const countBuilder = new QueryBuilder();
        countBuilder.addCTE({
            name: 'user_permissions',
            query: `
                SELECT 
                    u.id as "userId",
                    COALESCE(
                        jsonb_agg(
                            DISTINCT jsonb_build_object(
                                'id', p.id,
                                'name', p.name,
                                'description', p.description
                            )
                        ) FILTER (WHERE p.id IS NOT NULL),
                        '[]'::jsonb
                    ) as permissions,
                    COALESCE(
                        jsonb_agg(
                            DISTINCT jsonb_build_object(
                                'id', r.id,
                                'name', r.name,
                                'description', r.description
                            )
                        ) FILTER (WHERE r.id IS NOT NULL),
                        '[]'::jsonb
                    ) as roles
                FROM users u
                LEFT JOIN user_roles ur ON u.id = ur."userId"
                LEFT JOIN roles r ON ur."roleId" = r.id
                LEFT JOIN role_permissions rp ON r.id = rp."roleId"
                LEFT JOIN permissions p ON rp."permissionId" = p.id
                WHERE u."isActive" = true
                GROUP BY u.id
            `,
        });

        countBuilder
            .select('COUNT(DISTINCT u.id) as count')
            .from('users', 'u')
            .join('LEFT', 'user_permissions up', 'u.id = up."userId"');

        if (finalFilter) {
            countBuilder.where(finalFilter, { tableAlias: 'u', jsonbFieldAliasMap: JSONB_FIELD_ALIAS_MAP });
        }

        const { sql: countSql, parameters: countParams } = countBuilder.build();

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
            data: map(rows, (user) => new UserResponseDto(user.toJSON())),
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

    async findOneData(options: FindOptions<User>): Promise<User> {
        return this.userModel.findOne(options);
    }
    // --- Private Methods ---

    private _buildUserQuery(options: BuildUserQueryOptions): { sql: string; parameters: Record<string, any> } {
        const { filter, select, order, limit, offset } = options;
        const builder = new QueryBuilder({ fieldMap: SELECT_FIELD_MAP });

        const JSONB_FIELD_ALIAS_MAP = {
            roles: 'up',
            permissions: 'up',
        };

        // Add CTE for user permissions (pre-computed for performance)
        builder.addCTE({
            name: 'user_permissions',
            query: `
                SELECT 
                    u.id as "userId",
                    COALESCE(
                        jsonb_agg(
                            DISTINCT jsonb_build_object(
                                'id', p.id,
                                'name', p.name,
                                'description', p.description
                            )
                        ) FILTER (WHERE p.id IS NOT NULL),
                        '[]'::jsonb
                    ) as permissions,
                    COALESCE(
                        jsonb_agg(
                            DISTINCT jsonb_build_object(
                                'id', r.id,
                                'name', r.name,
                                'description', r.description
                            )
                        ) FILTER (WHERE r.id IS NOT NULL),
                        '[]'::jsonb
                    ) as roles
                FROM users u
                LEFT JOIN user_roles ur ON u.id = ur."userId"
                LEFT JOIN roles r ON ur."roleId" = r.id
                LEFT JOIN role_permissions rp ON r.id = rp."roleId"
                LEFT JOIN permissions p ON rp."permissionId" = p.id
                WHERE u."isActive" = true
                GROUP BY u.id
            `,
        });

        // Main query using CTE
        builder
            .select(select || DEFAULT_USER_SELECT_FIELDS)
            .from('users', 'u')
            .join('LEFT', 'user_permissions up', 'u.id = up."userId"');

        if (filter) {
            builder.where(filter, { tableAlias: 'u', jsonbFieldAliasMap: JSONB_FIELD_ALIAS_MAP });
        }

        if (order && order.length > 0) {
            builder.orderByArray(order);
        } else {
            builder.orderBy('createdAt', 'DESC');
        }

        if (limit) builder.limit(limit);
        if (offset) builder.offset(offset);

        return builder.build();
    }
}
