import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import { get, includes, isEmpty, map, size, split, toUpper } from 'lodash';
import { Sequelize } from 'sequelize-typescript';

import { IApiResponse } from '@/common/dto/api.response.dto';
import { IApiPaginatedResponse, IApiCursorPaginatedResponse } from '@/common/dto/paginated.response.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { QueryDto } from '@/common/dto/query.dto';
import { QueryBuilder } from '@/common/query-builder/query-utils';
import { Category } from '@/modules/categories/entities/category.entity';
import { Font } from '@/modules/fonts/entities/font.entity';
import { UsersService } from '@/modules/users/users.service';

import { CreateFontDto } from './dto/create-font.dto';
import { FontResponseDto } from './dto/font.response.dto';
import { QueryFontsCursorDto } from './dto/query-fonts-cursor.dto';
import { UpdateFontDto } from './dto/update-font.dto';

@Injectable()
export class FontsService {
    constructor(
        @InjectModel(Font)
        private readonly fontModel: typeof Font,
        private readonly sequelize: Sequelize,
        private readonly userService: UsersService,
    ) {}

    async create(createFontDto: CreateFontDto): Promise<IApiResponse<FontResponseDto>> {
        const { categoryIds, ...fontData } = createFontDto;

        const user = await this.userService.findOne(fontData.creatorId);
        if (!user) {
            throw new NotFoundException(`User with ID ${fontData.creatorId} not found`);
        }

        const font = await this.sequelize.transaction(async (transaction) => {
            const newFont = await this.fontModel.create(fontData, { transaction });

            if (categoryIds && !isEmpty(categoryIds)) {
                await newFont.$set('categories', categoryIds, { transaction });
            }

            // Reload to include associations in the returned object
            await newFont.reload({ include: [Category], transaction });
            return newFont;
        });

        return {
            statusCode: 201,
            message: 'Font created successfully.',
            data: new FontResponseDto(font),
        };
    }

    async query(paginationDto: PaginationDto, queryDto: QueryDto): Promise<IApiPaginatedResponse<FontResponseDto>> {
        const { filter, order, select } = queryDto;
        const { page, limit, q } = paginationDto;

        const createBuilder = () => new QueryBuilder().setCaseConversion('snake').from('fonts', 'f');

        const countQueryBuilder = createBuilder().select('COUNT(*) as count').where(filter);

        const selectQueryBuilder = createBuilder().select(select).where(filter);

        if (q) {
            const searchQuery = {
                or: [
                    { var: 'name', contains: q },
                    { var: 'family', contains: q },
                    { var: 'style', contains: q },
                ],
            };
            selectQueryBuilder.andWhere(searchQuery);
            countQueryBuilder.andWhere(searchQuery);
        }

        if (order && size(order) > 0) {
            selectQueryBuilder.orderByArray(order);
        } else {
            selectQueryBuilder.orderBy('createdAt', 'DESC');
        }

        selectQueryBuilder.limit(limit).offset((page - 1) * limit);

        const { sql: countSql, parameters: countParams } = countQueryBuilder.build();
        const { sql: selectSql, parameters: selectParams } = selectQueryBuilder.build();

        const [results, totalResult] = await Promise.all([
            this.sequelize.query(selectSql, {
                replacements: selectParams,
                mapToModel: true,
                model: Font,
            }),
            this.sequelize.query(countSql, {
                replacements: countParams,
                plain: true,
            }),
        ]);

        const total = Number((totalResult as { count: string | number })?.count || 0);

        return {
            statusCode: 200,
            message: 'Fonts retrieved successfully.',
            data: map(results, (font) => new FontResponseDto(font)),
            paging: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async queryWithCursor(queryDto: QueryFontsCursorDto): Promise<IApiCursorPaginatedResponse<FontResponseDto>> {
        const { filter, limit = 10, sort, cursor } = queryDto;

        const allowedSortFields = ['name', 'family', 'style', 'createdAt'];
        const sortParts = sort ? split(sort, ':') : ['createdAt', 'DESC'];
        const sortBy = get(sortParts, 0, 'createdAt');
        const sortOrder = (toUpper(get(sortParts, 1, 'DESC')) || 'DESC') as 'ASC' | 'DESC';

        if (!includes(allowedSortFields, sortBy)) {
            throw new BadRequestException(`Sorting by '${sortBy}' is not supported.`);
        }

        const fetchLimit = limit + 1;

        const builder = new QueryBuilder().setCaseConversion('snake').from('fonts', 'f');

        if (filter) {
            builder.where(filter);
        }

        if (cursor) {
            const decodedCursor = Buffer.from(cursor, 'base64').toString('ascii');
            const comparisonOp = sortOrder === 'DESC' ? 'lt' : 'gt'; // Use JsonLogic operators
            const cursorQuery = {
                [comparisonOp]: [{ var: sortBy }, decodedCursor],
            };
            builder.andWhere(cursorQuery);
        }

        builder.orderBy(sortBy, sortOrder).limit(fetchLimit);

        const { sql, parameters } = builder.build();

        const results = await this.sequelize.query<Font>(sql, {
            replacements: parameters,
            mapToModel: true,
            model: Font,
        });

        const hasNextPage = results.length > limit;
        const items = hasNextPage ? results.slice(0, limit) : results;

        const lastItem = items[items.length - 1];
        const nextCursor = lastItem
            ? Buffer.from(String(lastItem.getDataValue(sortBy as keyof Font) || '')).toString('base64')
            : null;

        return {
            statusCode: 200,
            message: 'Fonts retrieved successfully.',
            data: map(items, (font) => new FontResponseDto(font)),
            cursorPaging: {
                hasNextPage,
                nextCursor,
            },
        };
    }

    async findOne(id: string): Promise<IApiResponse<FontResponseDto>> {
        const font = await this.fontModel.findByPk(id);
        if (!font) {
            throw new NotFoundException(`Font with ID ${id} not found`);
        }
        return {
            statusCode: 200,
            message: 'Font retrieved successfully.',
            data: new FontResponseDto(font),
        };
    }

    async update(id: string, updateFontDto: UpdateFontDto): Promise<IApiResponse<FontResponseDto>> {
        const font = await this.fontModel.findByPk(id);
        if (!font) {
            throw new NotFoundException(`Font with ID ${id} not found`);
        }
        await font.update(updateFontDto);
        return {
            statusCode: 200,
            message: 'Font updated successfully.',
            data: new FontResponseDto(font),
        };
    }

    async remove(id: string): Promise<IApiResponse<null>> {
        const font = await this.fontModel.findByPk(id);
        if (!font) {
            throw new NotFoundException(`Font with ID ${id} not found`);
        }
        await font.update({ isActive: false });
        return {
            statusCode: 200,
            message: 'Font soft deleted successfully.',
            data: null,
        };
    }
}
