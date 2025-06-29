import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import { filter, forEach, get, isEmpty, map, replace, split, startsWith } from 'lodash';
import { Op, CreateOptions, DestroyOptions, FindOptions, Transaction, UpdateOptions } from 'sequelize';
import slugify from 'slugify';

import { IApiResponse } from '@/common/dto/api.response.dto';
import { IApiPaginatedResponse } from '@/common/dto/paginated.response.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { QueryDto } from '@/common/dto/query.dto';
import { ICrudService } from '@/common/interfaces/crud.interface';
import { QueryBuilder } from '@/common/query-builder/query-utils';
import { FindOneOptions } from '@/common/types/sequelize.types';
import { FontCollection } from '@/modules/collections/entities/collection.entity';
import { Font } from '@/modules/fonts/entities/font.entity';

import { CategoryResponseDto } from './dto/category.response.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';
import { CategoryTreeNode } from './types/category.types';

@Injectable()
export class CategoriesService
    implements ICrudService<Category, CategoryResponseDto, CreateCategoryDto, UpdateCategoryDto>
{
    constructor(
        @InjectModel(Category)
        private readonly categoryModel: typeof Category,
    ) {}

    // --- Entity-Returning Methods for Internal Use ---

    async create(createCategoryDto: CreateCategoryDto, options?: CreateOptions): Promise<Category> {
        const slug = slugify(createCategoryDto.name, { lower: true, strict: true });

        const existingCategory = await this.categoryModel.findOne({
            where: { slug },
            attributes: ['id'],
            ...options,
        });

        if (existingCategory) {
            throw new ConflictException(`Category with slug "${slug}" already exists.`);
        }

        let path: string;
        let level: number;

        if (createCategoryDto.parentId) {
            const parent = await this.categoryModel.findByPk(createCategoryDto.parentId, {
                attributes: ['path', 'level'],
                transaction: options?.transaction,
            });
            if (!parent) {
                throw new NotFoundException(`Parent category with ID ${createCategoryDto.parentId} not found`);
            }
            path = `${parent.path}/${slug}`;
            level = parent.level + 1;
        } else {
            path = `/${slug}`;
            level = 0;
        }

        const newCategory = await this.categoryModel.create(
            {
                ...createCategoryDto,
                slug,
                path,
                level,
            },
            options,
        );

        return await newCategory.reload({
            include: [{ model: Category, as: 'parent' }],
        });
    }

    async findOne(id: string, options?: FindOneOptions): Promise<Category> {
        const category = await this.categoryModel.findByPk(id, options);
        if (!category) {
            throw new NotFoundException(`Category with ID ${id} not found`);
        }
        return category;
    }

    async find(options: FindOptions<Category>): Promise<Category[]> {
        return this.categoryModel.findAll(options);
    }

    async findAll(paginationDto: PaginationDto, queryDto: QueryDto): Promise<{ rows: Category[]; total: number }> {
        const { page = 1, limit = 10, q } = paginationDto;
        const { filter, order, select } = queryDto || {};
        const offset = (page - 1) * limit;

        const createBuilder = () => new QueryBuilder().from('categories', 'c');

        const countQueryBuilder = createBuilder().select('COUNT(c.id) as count').where(filter);
        const selectQueryBuilder = createBuilder().select(select).where(filter);

        if (q) {
            const searchQuery = {
                or: [
                    { var: 'name', contains: q },
                    { var: 'slug', contains: q },
                ],
            };
            selectQueryBuilder.andWhere(searchQuery);
            countQueryBuilder.andWhere(searchQuery);
        }

        if (order?.length) {
            selectQueryBuilder.orderByArray(order);
        } else {
            selectQueryBuilder.orderBy('name', 'ASC');
        }

        selectQueryBuilder.limit(limit).offset(offset);

        const { sql: countSql, parameters: countParams } = countQueryBuilder.build();
        const { sql: selectSql, parameters: selectParams } = selectQueryBuilder.build();

        const [results, totalResult] = await Promise.all([
            this.categoryModel.sequelize.query<Category>(selectSql, {
                replacements: selectParams,
                mapToModel: true,
                model: Category,
            }),
            this.categoryModel.sequelize.query(countSql, {
                replacements: countParams,
                plain: true,
            }),
        ]);

        const total = Number((totalResult as { count: string | number })?.count || 0);
        return { rows: results, total };
    }

    async update(id: string, dto: UpdateCategoryDto, options?: UpdateOptions): Promise<Category> {
        const category = await this.categoryModel.findByPk(id, { transaction: options?.transaction });
        if (!category) {
            throw new NotFoundException(`Category with ID ${id} not found`);
        }

        const isSlugChanging = dto.name && dto.name !== category.name;
        const isParentChanging = dto.parentId !== undefined && dto.parentId !== category.parentId;

        if (!isSlugChanging && !isParentChanging) {
            return category.update(dto, { transaction: options?.transaction });
        }

        return this.performComplexUpdate(category, dto, { transaction: options?.transaction });
    }

    private async performComplexUpdate(
        category: Category,
        dto: UpdateCategoryDto,
        options: { transaction?: Transaction },
    ): Promise<Category> {
        const t = options.transaction || (await this.categoryModel.sequelize.transaction());
        try {
            const newSlug = dto.name ? slugify(dto.name, { lower: true, strict: true }) : category.slug;
            await this.validateSlug(newSlug, category.id, t);

            const { newPath, newLevel } = await this.calculateNewPathAndLevel(dto.parentId, newSlug, t);

            if (newPath !== category.path) {
                await this.updateDescendants(category, newPath, newLevel, t);
            }

            await category.update({ ...dto, slug: newSlug, path: newPath, level: newLevel }, { transaction: t });

            if (!options.transaction) await t.commit();

            return this.categoryModel.findByPk(category.id, {
                include: ['parent', 'children'],
                transaction: options.transaction,
            });
        } catch (error) {
            if (!options.transaction) await t.rollback();
            throw error;
        }
    }

    private async validateSlug(slug: string, categoryId: string, transaction: Transaction): Promise<void> {
        const existing = await this.categoryModel.findOne({
            where: { slug, id: { [Op.ne]: categoryId } },
            transaction,
        });
        if (existing) {
            throw new ConflictException(`Category with slug "${slug}" already exists.`);
        }
    }

    private async calculateNewPathAndLevel(
        parentId: string | null,
        newSlug: string,
        transaction: Transaction,
    ): Promise<{ newPath: string; newLevel: number }> {
        if (!parentId) {
            return { newPath: `/${newSlug}`, newLevel: 0 };
        }

        const parent = await this.categoryModel.findByPk(parentId, { attributes: ['path', 'level'], transaction });
        if (!parent) {
            throw new NotFoundException(`Parent category with ID ${parentId} not found`);
        }

        return { newPath: `${parent.path}/${newSlug}`, newLevel: parent.level + 1 };
    }

    private async updateDescendants(
        category: Category,
        newPath: string,
        newLevel: number,
        transaction: Transaction,
    ): Promise<void> {
        const oldPath = category.path;
        const descendants = await this.categoryModel.findAll({
            where: { path: { [Op.like]: `${oldPath}/%` } },
            transaction,
        });

        const levelDiff = newLevel - category.level;

        for (const descendant of descendants) {
            const updatedDescendantPath = replace(descendant.path, oldPath, newPath);
            await descendant.update(
                { path: updatedDescendantPath, level: descendant.level + levelDiff },
                { transaction },
            );
        }
    }

    async remove(id: string, options?: DestroyOptions): Promise<void> {
        const categoryEntity = (
            await this.findOneData({
                where: { id },
                include: [
                    { model: Category, as: 'children' },
                    { model: Font, as: 'fonts' },
                    { model: FontCollection, as: 'collections' },
                ],
            })
        ).toJSON();
        if (!categoryEntity) {
            throw new NotFoundException(`Category with ID ${id} not found`);
        }
        if (!isEmpty(get(categoryEntity, 'children', []))) {
            throw new ConflictException(`Category with ID ${id} has children`);
        }
        if (!isEmpty(get(categoryEntity, 'fonts', []))) {
            throw new ConflictException(`Category with ID ${id} has fonts`);
        }
        if (!isEmpty(get(categoryEntity, 'collections', []))) {
            throw new ConflictException(`Category with ID ${id} has collections`);
        }
        await categoryEntity.destroy(options);
    }

    // --- API-Facing Methods for Controller Use ---

    async createApi(createCategoryDto: CreateCategoryDto): Promise<IApiResponse<CategoryResponseDto>> {
        const newCategory = await this.create(createCategoryDto);
        return {
            statusCode: 201,
            message: 'Category created successfully.',
            data: new CategoryResponseDto(newCategory.toJSON()),
        };
    }

    async findOneApi(id: string): Promise<IApiResponse<CategoryResponseDto>> {
        const category = await this.findOne(id);
        return {
            statusCode: 200,
            message: 'Category retrieved successfully.',
            data: new CategoryResponseDto(category.toJSON()),
        };
    }

    async findAllApi(
        paginationDto: PaginationDto,
        queryDto: QueryDto,
    ): Promise<IApiPaginatedResponse<CategoryResponseDto>> {
        const { rows, total } = await this.findAll(paginationDto, queryDto);
        return {
            statusCode: 200,
            message: 'Categories retrieved successfully.',
            data: map(rows, (category) => new CategoryResponseDto(category)),
            paging: {
                page: paginationDto.page,
                limit: paginationDto.limit,
                total,
                totalPages: Math.ceil(total / paginationDto.limit),
            },
        };
    }

    async updateApi(id: string, updateCategoryDto: UpdateCategoryDto): Promise<IApiResponse<CategoryResponseDto>> {
        const updatedCategory = await this.update(id, updateCategoryDto);
        return {
            statusCode: 200,
            message: 'Category updated successfully.',
            data: new CategoryResponseDto(updatedCategory.toJSON()),
        };
    }

    async removeApi(id: string): Promise<IApiResponse<null>> {
        await this.remove(id);
        return {
            statusCode: 200,
            message: 'Category deleted successfully.',
            data: null,
        };
    }

    // --- Tree Structure Methods ---

    async findAllTree(maxDepth: number = 3): Promise<CategoryTreeNode[]> {
        const categories = await this.categoryModel.findAll({
            where: {
                isActive: true,
                level: { [Op.lte]: maxDepth },
            },
            order: [
                ['level', 'ASC'],
                ['sortOrder', 'ASC'],
            ],
            raw: true,
        });

        return this.buildTree(categories as CategoryTreeNode[]);
    }

    private buildTree(categories: CategoryTreeNode[]): CategoryTreeNode[] {
        const nodeMap = new Map<string, CategoryTreeNode>();
        const roots: CategoryTreeNode[] = [];

        // Use lodash.forEach for initialization
        forEach(categories, (category) => {
            nodeMap.set(category.id, { ...category, children: [] });
        });

        // Use lodash.forEach to link nodes and find roots
        forEach(categories, (category) => {
            const node = nodeMap.get(category.id);
            if (category.parentId && nodeMap.has(category.parentId)) {
                const parentNode = nodeMap.get(category.parentId);
                parentNode.children.push(node);
            } else {
                roots.push(node);
            }
        });

        return roots;
    }

    async findChildrenTree(parentId: string, maxDepth: number = 2): Promise<CategoryTreeNode[]> {
        const parent = await this.findOne(parentId);

        const descendants = await this.categoryModel.findAll({
            where: {
                isActive: true,
                path: { [Op.like]: `${parent.path}/%` },
                level: { [Op.lte]: parent.level + maxDepth },
            },
            order: [
                ['level', 'ASC'],
                ['sortOrder', 'ASC'],
            ],
            raw: true,
        });

        // The roots of the descendants' tree are the direct children of the parent.
        return this.buildTree(descendants as CategoryTreeNode[]);
    }

    // --- API Methods for Tree ---

    async findAllTreeApi(maxDepth: number = 3): Promise<IApiResponse<CategoryResponseDto[]>> {
        const tree = await this.findAllTree(maxDepth);
        return {
            statusCode: 200,
            message: 'Category tree retrieved successfully.',
            data: map(tree, (category) => new CategoryResponseDto(category)),
        };
    }

    async findChildrenTreeApi(parentId: string, maxDepth: number = 2): Promise<IApiResponse<CategoryResponseDto[]>> {
        const children = await this.findChildrenTree(parentId, maxDepth);
        return {
            statusCode: 200,
            message: 'Category children tree retrieved successfully.',
            data: map(children, (category) => new CategoryResponseDto(category)),
        };
    }

    // --- Utility Methods ---

    async findByPath(path: string): Promise<Category> {
        const category = await this.categoryModel.findOne({
            where: { path, isActive: true },
            raw: true,
        });

        if (!category) {
            throw new NotFoundException(`Category with path "${path}" not found`);
        }

        return category;
    }

    async findAncestors(categoryId: string): Promise<Category[]> {
        const category = await this.findOne(categoryId);
        const pathSegments = filter(split(category.path, '/'), Boolean);
        const ancestorPaths: string[] = [];

        let currentPath = '';
        forEach(pathSegments.slice(0, -1), (segment) => {
            currentPath += `/${segment}`;
            ancestorPaths.push(currentPath);
        });

        if (ancestorPaths.length === 0) return [];

        return this.categoryModel.findAll({
            where: {
                path: { [Op.in]: ancestorPaths },
                isActive: true,
            },
            order: [['level', 'ASC']],
            raw: true,
        });
    }

    async findAncestorsApi(categoryId: string): Promise<IApiResponse<CategoryResponseDto[]>> {
        const ancestors = await this.findAncestors(categoryId);
        return {
            statusCode: 200,
            message: 'Category ancestors retrieved successfully.',
            data: map(ancestors, (category) => new CategoryResponseDto(category)),
        };
    }

    async findByPathApi(path: string): Promise<IApiResponse<CategoryResponseDto>> {
        // Ensure path starts with /
        const normalizedPath = startsWith(path, '/') ? path : `/${path}`;
        const category = await this.findByPath(normalizedPath);
        return {
            statusCode: 200,
            message: 'Category retrieved successfully.',
            data: new CategoryResponseDto(category),
        };
    }

    // --- Custom Methods ---

    // find by ids and return a list ids of existing categories
    async findByIds(ids: string[]): Promise<string[]> {
        const categories = await this.categoryModel.findAll({
            where: { id: { [Op.in]: ids } },
        });
        return map(categories, 'id');
    }

    async findOneData(options: FindOptions<Category>): Promise<Category> {
        return this.categoryModel.findOne(options);
    }
}
