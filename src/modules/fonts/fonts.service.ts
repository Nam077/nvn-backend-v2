import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import { Promise } from 'bluebird';
import { isEmpty, map, size, some, startsWith, values } from 'lodash';
import { FindOptions, Op, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import slugify from 'slugify';

import { IApiResponse } from '@/common/dto/api.response.dto';
import { IApiPaginatedResponse } from '@/common/dto/paginated.response.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { QueryDto } from '@/common/dto/query.dto';
import { ICrudService } from '@/common/interfaces/crud.interface';
import { JsonLogicRuleNode } from '@/common/query-builder/json-logic-to-sql.builder';
import { QueryBuilder } from '@/common/query-builder/query-utils';
import { CategoriesService } from '@/modules/categories/categories.service';
import { Category } from '@/modules/categories/entities/category.entity';
import { File } from '@/modules/files/entities/file.entity';
import { FileService } from '@/modules/files/services/file.service';
import { FontWeight } from '@/modules/fonts/entities/font-weight.entity';
import { Tag } from '@/modules/tags/entities/tag.entity';
import { User } from '@/modules/users/entities/user.entity';
import { UsersService } from '@/modules/users/users.service';

import { TagsService } from '../tags/tags.service';
import { CreateFontDto } from './dto/create-font.dto';
import { FontResponseDto, FontGalleryImageDto } from './dto/font.response.dto';
import { UpdateFontDto } from './dto/update-font.dto';
import { Font } from './entities/font.entity';

interface BuildFontQueryOptions {
    filter?: JsonLogicRuleNode;
    select?: string[];
    order?: Array<{ field: string; direction: 1 | -1 }>;
    limit?: number;
    offset?: number;
}

const SELECT_FIELD_MAP = {
    id: 'f.id',
    name: 'f.name',
    slug: 'f.slug',
    authors: 'f.authors',
    description: 'f.description',
    fontType: 'f."fontType"',
    price: 'f.price',
    downloadCount: 'f."downloadCount"',
    isActive: 'f."isActive"',
    metadata: 'f.metadata',
    createdAt: 'f."createdAt"',
    updatedAt: 'f."updatedAt"',
    thumbnailUrl: 'f."thumbnailUrl"',
    // JSONB Aggregated Objects/Arrays
    creator:
        "jsonb_build_object('id', creator.id, 'email', creator.email, 'firstName', creator.\"firstName\", 'lastName', creator.\"lastName\") AS creator",
    thumbnailFile: "jsonb_build_object('id', tf.id, 'url', tf.url) AS \"thumbnailFile\"",
    categories: "COALESCE(fca.categories, '[]'::jsonb) AS categories",
    tags: "COALESCE(fta.tags, '[]'::jsonb) AS tags",
    weights: "COALESCE(fwa.weights, '[]'::jsonb) AS weights",
    weightCount: 'COALESCE(fwa."weightCount", 0) AS "weightCount"',
} as const;

const FIELD_ALIAS_MAP = new Map([
    ['categories.id', 'fca."categoryIds"'],
    ['categories.name', 'fca."categoryNames"'],
    ['authors.name', 'faa."authorNames"'],
    ['tags.id', 'fta."tagIds"'],
    ['tags.name', 'fta."tagNames"'],
    ['weights.id', 'fwa."weightIds"'],
    ['weights.name', 'fwa."weightNames"'],
]);

const DEFAULT_FONT_SELECT_FIELDS = values(SELECT_FIELD_MAP);

@Injectable()
export class FontsService implements ICrudService<Font, FontResponseDto, CreateFontDto, UpdateFontDto> {
    constructor(
        @InjectModel(Font)
        private readonly fontModel: typeof Font,
        private readonly sequelize: Sequelize,
        private readonly userService: UsersService,
        private readonly tagsService: TagsService,
        private readonly categoriesService: CategoriesService,
        private readonly fileService: FileService,
    ) {}

    async checkExistsBySlug(name: string, id?: string, options?: FindOptions<Font>): Promise<boolean> {
        const font = await this.fontModel.findOne({
            where: { slug: slugify(name, { lower: true, strict: true }), id: { [Op.ne]: id ?? null } },
            ...options,
        });
        return !!font;
    }

    // --- Entity-Returning Methods for Internal Use ---

    async create(createFontDto: CreateFontDto): Promise<Font> {
        const { categoryIds, tags, ...fontData } = createFontDto;

        const font = await this.sequelize.transaction(async (transaction) => {
            // --- Validation inside transaction (run in parallel) ---
            const [user, existingFont, { galleryImages }] = await Promise.all([
                this.userService.findOne(fontData.creatorId, { transaction }),
                this.checkExistsBySlug(createFontDto.name, null, { transaction }),
                this._validateFiles(fontData, transaction),
            ]);

            if (!user) {
                throw new NotFoundException(`User with ID ${fontData.creatorId} not found`);
            }
            if (existingFont) {
                throw new ConflictException(`Font with name ${createFontDto.name} already exists`);
            }

            // --- Create and associate inside transaction ---
            const newFont = await this.fontModel.create(
                {
                    ...fontData,
                    galleryImages,
                    slug: slugify(createFontDto.name, { lower: true, strict: true }),
                },
                { transaction },
            );

            await this._handleAssociations(newFont, { categoryIds, tags }, transaction);

            return newFont;
        });

        // Reload to get associations
        return font.reload({
            include: [
                { model: User, as: 'creator' },
                { model: FontWeight, as: 'weights' },
                { model: Category, as: 'categories' },
                { model: Tag, as: 'tags' },
                { model: File, as: 'thumbnailFile' },
            ],
        });
    }

    async findOne(id: string, options?: FindOptions): Promise<Font> {
        const font = await this.fontModel.findByPk(id, options);
        if (!font) {
            throw new NotFoundException(`Font with ID ${id} not found`);
        }
        return font;
    }

    async find(options: FindOptions<Font>): Promise<Font[]> {
        return this.fontModel.findAll(options);
    }

    async findAll(paginationDto: PaginationDto, queryDto: QueryDto): Promise<{ rows: Font[]; total: number }> {
        const { page = 1, limit = 10, q } = paginationDto;
        const { filter, order, select } = queryDto || {};
        const offset = (page - 1) * limit;

        let finalFilter = filter;
        if (q) {
            const searchQuery = {
                or: [
                    { contains: [{ var: 'name' }, q] },
                    { contains: [{ var: 'description' }, q] },
                    { contains: [{ var: 'authors.name' }, q] },
                    { contains: [{ var: 'tags.name' }, q] },
                    { contains: [{ var: 'categories.name' }, q] },
                    { contains: [{ var: 'weights.name' }, q] },
                ],
            };
            finalFilter = finalFilter ? { and: [finalFilter, searchQuery] } : searchQuery;
        }

        const { sql: selectSql, parameters: selectParams } = this._buildFontQuery({
            filter: finalFilter,
            select: isEmpty(select) ? DEFAULT_FONT_SELECT_FIELDS : select,
            order,
            limit,
            offset,
        });

        const { sql: countSql, parameters: countParams } = this._buildFontQuery({
            filter: finalFilter,
            select: ['COUNT(DISTINCT f.id) as count'],
        });

        const [results, totalResult] = await Promise.all([
            this.sequelize.query<Font>(selectSql, {
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
        return { rows: results, total };
    }

    async update(id: string, updateFontDto: UpdateFontDto): Promise<Font> {
        const { tags, categoryIds, ...fontData } = updateFontDto;

        const font = await this.findOne(id);
        const dataToUpdate: Partial<Font> = { ...fontData };

        if (updateFontDto.name && updateFontDto.name !== font.name) {
            dataToUpdate.slug = slugify(updateFontDto.name, { lower: true, strict: true });
        }

        await this.sequelize.transaction(async (transaction) => {
            const [existingFont, { galleryImages }] = await Promise.all([
                dataToUpdate.name
                    ? this.checkExistsBySlug(dataToUpdate.name, id, { transaction })
                    : Promise.resolve(false),
                this._validateFiles(fontData, transaction),
            ]);

            if (existingFont) {
                throw new ConflictException(`Font with name ${dataToUpdate.name} already exists`);
            }

            if (galleryImages !== undefined) {
                dataToUpdate.galleryImages = galleryImages;
            }

            await font.update(dataToUpdate, { transaction });

            await this._handleAssociations(font, { categoryIds, tags }, transaction);
        });

        return this.findOne(font.id, {
            include: ['creator', 'weights', 'categories', 'tags', 'thumbnailFile'],
        });
    }

    async remove(id: string): Promise<void> {
        const font = await this.findOne(id);
        // Soft delete by default
        await font.update({ isActive: false });
    }

    // --- API-Facing Methods for Controller Use ---
    async createApi(createFontDto: CreateFontDto): Promise<IApiResponse<FontResponseDto>> {
        const newFont = await this.create(createFontDto);
        return {
            statusCode: 201,
            message: 'Font created successfully.',
            data: new FontResponseDto(newFont),
        };
    }
    async findOneApi(id: string): Promise<IApiResponse<FontResponseDto>> {
        const font = await this.findOne(id, {
            include: ['creator', 'weights', 'categories', 'tags', 'thumbnailFile'],
        });
        return {
            statusCode: 200,
            message: 'Font retrieved successfully.',
            data: new FontResponseDto(font),
        };
    }
    async findAllApi(
        paginationDto: PaginationDto,
        queryDto: QueryDto,
    ): Promise<IApiPaginatedResponse<FontResponseDto>> {
        const { rows, total } = await this.findAll(paginationDto, queryDto);
        return {
            statusCode: 200,
            message: 'Fonts retrieved successfully.',
            data: map(rows, (font) => new FontResponseDto(font.toJSON())),
            paging: {
                page: paginationDto.page,
                limit: paginationDto.limit,
                total,
                totalPages: Math.ceil(total / paginationDto.limit),
            },
        };
    }
    async updateApi(id: string, updateFontDto: UpdateFontDto): Promise<IApiResponse<FontResponseDto>> {
        const updatedFont = await this.update(id, updateFontDto);
        return {
            statusCode: 200,
            message: 'Font updated successfully.',
            data: new FontResponseDto(updatedFont),
        };
    }
    async removeApi(id: string): Promise<IApiResponse<null>> {
        await this.remove(id);
        return {
            statusCode: 200,
            message: 'Font soft deleted successfully.',
            data: null,
        };
    }
    async findOneData(options: FindOptions<Font>): Promise<Font> {
        return this.fontModel.findOne(options);
    }
    // --- Helper Methods ---

    private async _validateFiles(
        data: { thumbnailFileId?: string; galleryImages?: FontGalleryImageDto[] },
        transaction: Transaction,
    ): Promise<{ galleryImages?: FontGalleryImageDto[] }> {
        const thumbnailValidation = async () => {
            if (data.thumbnailFileId) {
                const existingFile = await this.fileService.checkFileExists(data.thumbnailFileId, transaction);
                if (!existingFile) {
                    throw new NotFoundException(`File with ID ${data.thumbnailFileId} not found`);
                }
            }
        };

        const galleryValidation = async (): Promise<{ galleryImages?: FontGalleryImageDto[] }> => {
            if (data.galleryImages) {
                if (size(data.galleryImages) > 0) {
                    const validatedGalleryImages = await this.fileService.checkExists(data.galleryImages, transaction);
                    return { galleryImages: validatedGalleryImages };
                }
                return { galleryImages: [] };
            }
            return {};
        };

        const [, galleryResult] = await Promise.all([thumbnailValidation(), galleryValidation()]);
        return galleryResult;
    }

    private async _handleAssociations(
        font: Font,
        data: {
            categoryIds?: string[];
            tags?: string[];
        },
        transaction: Transaction,
    ): Promise<void> {
        const promises = [];

        if (data.categoryIds) {
            const handleCategories = async () => {
                const existingCategories = await this.categoriesService.findByIds(data.categoryIds, transaction);
                await font.$set('categories', existingCategories, { transaction });
            };
            promises.push(handleCategories());
        }

        if (data.tags) {
            const handleTags = async () => {
                const tagIdsToSync = await this.tagsService.getTagIdsFromMixedArray(data.tags, transaction);
                await font.$set('tags', tagIdsToSync, { transaction });
            };
            promises.push(handleTags());
        }

        if (size(promises) > 0) {
            await Promise.all(promises);
        }
    }

    // --- Keep private _buildFontQuery method ---
    private _buildFontQuery(options: BuildFontQueryOptions): { sql: string; parameters: Record<string, any> } {
        const { filter, select, order, limit, offset } = options;
        const builder = new QueryBuilder({ fieldMap: SELECT_FIELD_MAP });

        // CTE for aggregated font categories
        builder.addCTE({
            name: 'font_categories_agg',
            query: `
                SELECT 
                    fc."fontId",
                    jsonb_agg(DISTINCT jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug)) FILTER (WHERE c.id IS NOT NULL) as categories,
                    array_agg(DISTINCT c.id) FILTER (WHERE c.id IS NOT NULL) as "categoryIds",
                    string_agg(DISTINCT c.name, ' ') as "categoryNames"
                FROM font_categories fc
                JOIN categories c ON fc."categoryId" = c.id
                GROUP BY fc."fontId"
            `,
        });

        // CTE for aggregated font authors from JSONB
        builder.addCTE({
            name: 'font_authors_agg',
            query: `
                SELECT
                    f.id as "fontId",
                    string_agg(author->>'name', ' ') as "authorNames"
                FROM
                    fonts f,
                    jsonb_array_elements(f.authors) as author
                WHERE f.authors IS NOT NULL AND jsonb_array_length(f.authors) > 0
                GROUP BY
                    f.id
            `,
        });

        // CTE for aggregated font tags
        builder.addCTE({
            name: 'font_tags_agg',
            query: `
                SELECT
                    ft."fontId",
                    jsonb_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug)) FILTER (WHERE t.id IS NOT NULL) as tags,
                    array_agg(DISTINCT t.id) FILTER (WHERE t.id IS NOT NULL) as "tagIds",
                    string_agg(DISTINCT t.name, ' ') as "tagNames"
                FROM font_tags ft
                JOIN tags t ON ft."tagId" = t.id
                GROUP BY ft."fontId"
            `,
        });

        // CTE for aggregated font weights
        builder.addCTE({
            name: 'font_weights_agg',
            query: `
                SELECT 
                    fw."fontId",
                    jsonb_agg(DISTINCT jsonb_build_object('id', fw.id, 'name', fw."weightName", 'weight', fw."weightValue")) FILTER (WHERE fw.id IS NOT NULL) as weights,
                    array_agg(DISTINCT fw.id) FILTER (WHERE fw.id IS NOT NULL) as "weightIds",
                    string_agg(DISTINCT fw."weightName", ' ') as "weightNames",
                    count(fw.id) as "weightCount"
                FROM font_weights fw
                GROUP BY fw."fontId"
            `,
        });

        // Main Query
        builder
            .select(select || DEFAULT_FONT_SELECT_FIELDS)
            .from('fonts', 'f')
            .join('LEFT', 'users creator', 'f."creatorId" = creator.id')
            .join('LEFT', 'files tf', 'f."thumbnailFileId" = tf.id')
            .join('LEFT', 'font_categories_agg fca', 'f.id = fca."fontId"')
            .join('LEFT', 'font_authors_agg faa', 'f.id = faa."fontId"')
            .join('LEFT', 'font_tags_agg fta', 'f.id = fta."fontId"')
            .join('LEFT', 'font_weights_agg fwa', 'f.id = fwa."fontId"');

        if (filter) {
            const jsonLogicOptions = {
                tableAlias: 'f',
                fieldMapper: (field: string) => FIELD_ALIAS_MAP.get(field) || null,
            };
            builder.where(filter, jsonLogicOptions);
        }

        if (order && order.length > 0) {
            builder.orderByArray(order);
        } else if (!select || !some(select, (s) => startsWith(s, 'COUNT'))) {
            // Do not add default order for count queries
            builder.orderBy('createdAt', 'DESC');
        }

        if (limit) builder.limit(limit);
        if (offset) builder.offset(offset);

        return builder.build();
    }
}
