import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import { Promise } from 'bluebird';
import { isEmpty, join, map, size, toLower, words, keyBy, forEach, get } from 'lodash';
import { FindOptions, Op, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import slugify from 'slugify';
import { v4 as uuidv4 } from 'uuid';

import { IApiResponse } from '@/common/dto/api.response.dto';
import { IApiPaginatedResponse } from '@/common/dto/paginated.response.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { QueryDto } from '@/common/dto/query.dto';
import { ICrudService } from '@/common/interfaces/crud.interface';
import { JsonLogicToSqlBuilder } from '@/common/query-builder/json-logic-to-sql.builder';
import { CategoriesService } from '@/modules/categories/categories.service';
import { Category } from '@/modules/categories/entities/category.entity';
import { File } from '@/modules/files/entities/file.entity';
import { FileService } from '@/modules/files/services/file.service';
import { FontCategory } from '@/modules/fonts/entities/font-category.entity';
import { FontTag } from '@/modules/fonts/entities/font-tag.entity';
import { FontWeight } from '@/modules/fonts/entities/font-weight.entity';
import { Tag } from '@/modules/tags/entities/tag.entity';
import { User } from '@/modules/users/entities/user.entity';
import { UsersService } from '@/modules/users/users.service';

import { TagsService } from '../tags/tags.service';
import { CreateFontDto } from './dto/create-font.dto';
import { FontResponseDto, FontGalleryImageDto } from './dto/font.response.dto';
import { UpdateFontDto } from './dto/update-font.dto';
import { Font } from './entities/font.entity';

const VIEW_FIELD_MAP = new Map([
    ['categories.id', '"categoryIds"'],
    ['tags.id', '"tagIds"'],
    ['weights.id', '"weightIds"'],
]);

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

    async bulkCreate(createFontDtos: CreateFontDto[]): Promise<{ id: string }[]> {
        if (isEmpty(createFontDtos)) {
            return [];
        }

        // eslint-disable-next-line sonarjs/cognitive-complexity
        return this.sequelize.transaction(async (transaction) => {
            // 1. Collect all related IDs and data from all DTOs
            const allCreatorIds = new Set<string>();
            const allThumbnailFileIds = new Set<string>();
            const allGalleryFileIds = new Set<string>();
            const allCategoryIds = new Set<string>();
            const allTags = new Set<string>();
            const initialSlugs: string[] = [];

            for (const dto of createFontDtos) {
                initialSlugs.push(slugify(dto.name, { lower: true, strict: true }));
                allCreatorIds.add(dto.creatorId);
                if (dto.thumbnailFileId) allThumbnailFileIds.add(dto.thumbnailFileId);
                if (dto.galleryImages) {
                    for (const image of dto.galleryImages) {
                        if (image.fileId) allGalleryFileIds.add(image.fileId);
                    }
                }
                if (dto.categoryIds) forEach(dto.categoryIds, (id) => allCategoryIds.add(id));
                if (dto.tags) forEach(dto.tags, (tag) => allTags.add(tag));
            }

            // Combine all file IDs for a single query
            const allFileIds = new Set([...allThumbnailFileIds, ...allGalleryFileIds]);

            // 2. Slug conflict resolution
            const existingSlugsSet = new Set(
                map(
                    await this.fontModel.findAll({
                        where: { slug: { [Op.in]: initialSlugs } },
                        attributes: ['slug'],
                        raw: true,
                        transaction,
                    }),
                    'slug',
                ),
            );

            const resolvedSlugs = map(initialSlugs, (slug) => {
                if (existingSlugsSet.has(slug)) {
                    return `${slug}-${uuidv4().substring(0, 4)}`;
                }
                return slug;
            });

            // 3. Validate existence of all related entities in parallel

            const [users, files, categories, tagIds] = await Promise.all([
                this.userService.findByIds([...allCreatorIds], transaction),
                this.fileService.findByIds([...allFileIds], transaction),
                this.categoriesService.findByIds([...allCategoryIds], transaction),
                this.tagsService.getTagIdsFromMixedArray([...allTags], transaction),
            ]);

            const usersById = keyBy(users, 'id');
            const filesById = keyBy(files, 'id');
            const categoriesById = keyBy(categories, 'id');
            keyBy(await this.tagsService.findByIds(tagIds, transaction), 'id');

            // 4. Prepare data for bulk creation
            const fontsToCreate: any[] = [];
            const fontCategoriesToCreate: any[] = [];
            const fontTagsToCreate: any[] = [];

            for (const [index, dto] of createFontDtos.entries()) {
                // Validate foreign keys for this DTO
                if (!usersById[dto.creatorId]) throw new NotFoundException(`User with ID ${dto.creatorId} not found.`);
                if (dto.thumbnailFileId && !filesById[dto.thumbnailFileId])
                    throw new NotFoundException(`Thumbnail file with ID ${dto.thumbnailFileId} not found.`);
                forEach(dto.galleryImages, (img) => {
                    if (img.fileId && !filesById[img.fileId])
                        throw new NotFoundException(`Gallery file with ID ${img.fileId} not found.`);
                });
                forEach(dto.categoryIds, (id) => {
                    if (!get(categoriesById, id)) throw new NotFoundException(`Category with ID ${id} not found.`);
                });

                const newFontId = uuidv4();
                fontsToCreate.push({
                    id: newFontId,
                    ...dto,
                    slug: get(resolvedSlugs, index),
                });

                forEach(dto.categoryIds, (categoryId) => {
                    fontCategoriesToCreate.push({ fontId: newFontId, categoryId });
                });

                forEach(tagIds, (tagId) => {
                    fontTagsToCreate.push({ fontId: newFontId, tagId });
                });
            }

            // 5. Execute bulk inserts
            await this.fontModel.bulkCreate(fontsToCreate, { transaction });
            await FontCategory.bulkCreate(fontCategoriesToCreate, { transaction });
            await FontTag.bulkCreate(fontTagsToCreate, { transaction });

            return map(fontsToCreate, (f) => ({ id: get(f, 'id') as string }));
        });
    }

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
        const { filter, order } = queryDto || {};
        const offset = (page - 1) * limit;

        const whereClauses: string[] = [];
        let replacements: Record<string, any> = {
            limit,
            offset,
        };

        if (q) {
            // Use lodash's `words` to cleanly split the query string.
            const terms = words(q);

            if (!isEmpty(terms)) {
                // Add the prefix operator `:*` to the last word.
                terms[terms.length - 1] = `${terms[terms.length - 1]}:*`;

                // Join all terms with the AND operator.
                const query = join(terms, ' & ');

                whereClauses.push("document @@ to_tsquery('simple', :query)");
                replacements.query = toLower(query);
            }
        }

        if (filter && !isEmpty(filter)) {
            const builder = new JsonLogicToSqlBuilder({
                fieldMapper: (field) => VIEW_FIELD_MAP.get(field),
            });
            const { sql, parameters } = builder.build(filter);
            whereClauses.push(sql);
            replacements = { ...replacements, ...parameters };
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const orderSql =
            order && order.length > 0
                ? `ORDER BY ${join(
                      map(order, (o) => `"${o.field}" ${o.direction === 1 ? 'ASC' : 'DESC'}`),
                      ', ',
                  )}`
                : 'ORDER BY "createdAt" DESC';

        const selectSql = `
            SELECT *
            FROM nvn_font_search
            ${whereSql}
            ${orderSql}
            LIMIT :limit
            OFFSET :offset
        `;

        const countSql = `
            SELECT COUNT(id) as count
            FROM nvn_font_search
            ${whereSql}
        `;

        const [results, totalResult] = await Promise.all([
            this.sequelize.query<Font>(selectSql, {
                replacements,
                mapToModel: true, // This might not work directly with a view.
                model: Font, // The view has the same columns.
            }),
            this.sequelize.query(countSql, {
                replacements,
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
        await font.destroy();
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

    async bulkCreateApi(createFontDtos: CreateFontDto[]): Promise<IApiResponse<{ id: string }[]>> {
        const newFonts = await this.bulkCreate(createFontDtos);
        return {
            statusCode: 201,
            message: `${newFonts.length} fonts created successfully.`,
            data: newFonts,
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
}
