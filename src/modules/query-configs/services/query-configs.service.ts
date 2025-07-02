import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import { map } from 'lodash';
import { FindOptions, UpdateOptions } from 'sequelize';

import { IApiResponse } from '@/common/dto/api.response.dto';
import { IApiPaginatedResponse } from '@/common/dto/paginated.response.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { QueryDto } from '@/common/dto/query.dto';
import { ICrudService, AuthenticatedUser } from '@/common/interfaces/crud.interface';
import { CreateQueryConfigDto } from '@/modules/query-configs/dto/create-query-config.dto';
import { QueryConfigResponseDto } from '@/modules/query-configs/dto/query-config.response.dto';
import { UpdateQueryConfigDto } from '@/modules/query-configs/dto/update-query-config.dto';
import { QueryConfig } from '@/modules/query-configs/entities/query-config.entity';
import { QueryConfigLoaderService } from '@/modules/query-validation/services/query-config-loader.service';

@Injectable()
export class QueryConfigsService
    implements ICrudService<QueryConfig, QueryConfigResponseDto, CreateQueryConfigDto, UpdateQueryConfigDto>
{
    constructor(
        @InjectModel(QueryConfig)
        private readonly queryConfigModel: typeof QueryConfig,
        @Inject(QueryConfigLoaderService)
        private readonly queryConfigLoader: QueryConfigLoaderService,
    ) {}

    async create(
        createQueryConfigDto: CreateQueryConfigDto,
        _options?: any,
        authUser?: AuthenticatedUser,
    ): Promise<QueryConfig> {
        const { key } = createQueryConfigDto;
        const userId = authUser?.id || null;

        await this.queryConfigLoader.invalidateCache(key, userId);

        const existing = await this.queryConfigModel.findOne({ where: { key, userId } });
        if (existing) {
            throw new ConflictException(`Configuration with key "${key}" already exists for this user.`);
        }

        return this.queryConfigModel.create({ ...createQueryConfigDto, userId });
    }

    async findOne(id: string, options?: FindOptions<QueryConfig>): Promise<QueryConfig> {
        const config = await this.queryConfigModel.findByPk(id, options);
        if (!config) {
            throw new NotFoundException(`Configuration with ID ${id} not found.`);
        }
        return config;
    }

    async find(options: FindOptions<QueryConfig>): Promise<QueryConfig[]> {
        return this.queryConfigModel.findAll(options);
    }

    async findAll(paginationDto: PaginationDto, _queryDto: QueryDto): Promise<{ rows: QueryConfig[]; total: number }> {
        // Basic implementation - can be enhanced later
        const { page = 1, limit = 10 } = paginationDto;
        const offset = (page - 1) * limit;

        const { rows, count } = await this.queryConfigModel.findAndCountAll({
            limit,
            offset,
        });

        return { rows, total: count };
    }

    async update(
        id: string,
        updateQueryConfigDto: UpdateQueryConfigDto,
        _options?: UpdateOptions,
        _authUser?: AuthenticatedUser,
    ): Promise<QueryConfig> {
        const config = await this.findOne(id);
        await this.queryConfigLoader.invalidateCache(config.key, config.userId);
        return config.update(updateQueryConfigDto);
    }

    async remove(id: string): Promise<void> {
        const config = await this.findOne(id);
        await this.queryConfigLoader.invalidateCache(config.key, config.userId);
        await config.destroy();
    }

    async findOneData(options: FindOptions<QueryConfig>): Promise<QueryConfig> {
        const config = await this.queryConfigModel.findOne(options);
        if (!config) {
            throw new NotFoundException('Configuration not found.');
        }
        return config;
    }

    async findByKeyForUser(key: string, userId?: string): Promise<QueryConfig> {
        const configValue = await this.queryConfigLoader.findConfigForKey(key, userId || null);
        // This method now returns the raw config value, not the entity.
        // It might need adjustment based on how it's used elsewhere,
        // or it could be deprecated in favor of using QueryConfigLoaderService directly.
        // For now, returning a mock entity-like structure.
        return { value: configValue } as QueryConfig;
    }

    async createApi(
        createQueryConfigDto: CreateQueryConfigDto,
        authUser?: AuthenticatedUser,
    ): Promise<IApiResponse<QueryConfigResponseDto>> {
        const queryConfig = await this.create(createQueryConfigDto, {}, authUser);
        return {
            statusCode: 201,
            message: 'Configuration created successfully.',
            data: new QueryConfigResponseDto(queryConfig),
        };
    }

    async findOneApi(id: string): Promise<IApiResponse<QueryConfigResponseDto>> {
        const queryConfig = await this.findOne(id);
        return {
            statusCode: 200,
            message: 'Configuration retrieved successfully.',
            data: new QueryConfigResponseDto(queryConfig),
        };
    }

    async findAllApi(
        paginationDto: PaginationDto,
        queryDto: QueryDto,
    ): Promise<IApiPaginatedResponse<QueryConfigResponseDto>> {
        const { rows, total } = await this.findAll(paginationDto, queryDto);
        return {
            statusCode: 200,
            message: 'Configurations retrieved successfully.',
            data: map(rows, (config) => new QueryConfigResponseDto(config)),
            paging: {
                page: paginationDto.page,
                limit: paginationDto.limit,
                total,
                totalPages: Math.ceil(total / paginationDto.limit),
            },
        };
    }

    async updateApi(
        id: string,
        updateQueryConfigDto: UpdateQueryConfigDto,
    ): Promise<IApiResponse<QueryConfigResponseDto>> {
        const queryConfig = await this.update(id, updateQueryConfigDto);
        return {
            statusCode: 200,
            message: 'Configuration updated successfully.',
            data: new QueryConfigResponseDto(queryConfig),
        };
    }

    async removeApi(id: string): Promise<IApiResponse<null>> {
        await this.remove(id);
        return {
            statusCode: 200,
            message: 'Configuration deleted successfully.',
            data: null,
        };
    }
}
