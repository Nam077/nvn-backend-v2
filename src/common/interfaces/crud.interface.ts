import { CreateOptions, DestroyOptions, FindOptions, Model, UpdateOptions } from 'sequelize';

import { IApiResponse } from '../dto/api.response.dto';
import { IApiPaginatedResponse } from '../dto/paginated.response.dto';
import { PaginationDto } from '../dto/pagination.dto';
import { QueryDto } from '../dto/query.dto';
/**
 * A generic interface for CRUD services.
 * It standardizes the methods for creating, reading, updating, and deleting entities,
 * and separates internal entity-returning logic from public API DTO-returning logic.
 *
 * @template TEntity The type of the data entity.
 * @template TResponseDto The type of the DTO used for API responses.
 * @template TCreateDto The type of the DTO for creating an entity.
 * @template TUpdateDto The type of the DTO for updating an entity.
 */
export interface ICrudService<TEntity extends Model, TResponseDto, TCreateDto, TUpdateDto> {
    // --- Methods for internal use by other services ---

    /**
     * Creates a new entity.
     * @param createDto DTO for creating the entity.
     * @param options Sequelize create options for customization.
     * @returns A promise that resolves to the created entity.
     * @throws {ConflictException} If a resource with a unique constraint already exists.
     * @example
     * ```typescript
     * const newUser = await service.create({ email: 'test@example.com', password: '...' });
     * ```
     */
    create: (createDto: TCreateDto, options?: CreateOptions) => Promise<TEntity>;

    /**
     * Finds a single entity by its ID.
     * @param id The ID of the entity.
     * @param options Sequelize find options for customization (where clause is omitted).
     * @returns A promise that resolves to the found entity.
     * @throws {NotFoundException} If the entity with the specified ID is not found.
     * @example
     * ```typescript
     * const user = await service.findOne('some-uuid-v4');
     * ```
     */
    findOne: (id: string, options?: Omit<FindOptions<TEntity>, 'where'>) => Promise<TEntity>;

    /**
     * Finds multiple entities based on provided options.
     * @param options Sequelize find options for customization.
     * @returns A promise that resolves to an array of found entities.
     * @example
     * ```typescript
     * const activeUsers = await service.find({ where: { isActive: true } });
     * ```
     */
    find: (options: FindOptions<TEntity>) => Promise<TEntity[]>;

    /**
     * Finds all entities with pagination and filtering.
     * @param paginationDto DTO for pagination (page, limit).
     * @param queryDto DTO for filtering and sorting.
     * @returns An object with the entities and total count.
     * @example
     * ```typescript
     * const { rows, total } = await service.findAll({ page: 1, limit: 10 }, { filter: { ... } });
     * ```
     */
    findAll: (paginationDto: PaginationDto, queryDto: QueryDto) => Promise<{ rows: TEntity[]; total: number }>;

    /**
     * Updates an entity by its ID.
     * @param id The ID of the entity.
     * @param updateDto DTO for updating the entity.
     * @param options Sequelize update options for customization.
     * @returns A promise that resolves to the updated entity.
     * @throws {NotFoundException} If the entity with the specified ID is not found.
     * @throws {ConflictException} If a unique constraint fails on update.
     * @example
     * ```typescript
     * const updatedUser = await service.update('some-uuid-v4', { firstName: 'John' });
     * ```
     */
    update: (id: string, updateDto: TUpdateDto, options?: UpdateOptions) => Promise<TEntity>;

    /**
     * Removes an entity by its ID.
     * @param id The ID of the entity.
     * @param options Sequelize find options for customization.
     * @returns A promise that resolves when the entity is removed.
     * @throws {NotFoundException} If the entity with the specified ID is not found.
     * @example
     * ```typescript
     * await service.remove('some-uuid-v4');
     * ```
     */
    remove: (id: string, options?: DestroyOptions) => Promise<void>;

    // --- Methods for use by controllers, returning standardized API responses ---

    /**
     * Creates a new entity and returns a standardized API response.
     * @param createDto DTO for creating the entity.
     * @returns A standardized API response with the created entity's DTO.
     * @example
     * ```typescript
     * // In a controller
     * return service.createApi({ email: 'test@example.com', password: '...' });
     * ```
     */
    createApi: (createDto: TCreateDto) => Promise<IApiResponse<TResponseDto>>;

    /**
     * Finds a single entity and returns a standardized API response.
     * @param id The ID of the entity.
     * @returns A standardized API response with the found entity's DTO.
     * @example
     * ```typescript
     * // In a controller
     * return service.findOneApi('some-uuid-v4');
     * ```
     */
    findOneApi: (id: string) => Promise<IApiResponse<TResponseDto>>;

    /**
     * Finds all entities and returns a standardized paginated API response.
     * @param paginationDto DTO for pagination (page, limit).
     * @param queryDto DTO for filtering and sorting.
     * @returns A standardized paginated API response.
     * @example
     * ```typescript
     * // In a controller
     * return service.findAllApi({ page: 1, limit: 10 }, { filter: { ... } });
     * ```
     */
    findAllApi: (paginationDto: PaginationDto, queryDto: QueryDto) => Promise<IApiPaginatedResponse<TResponseDto>>;

    /**
     * Updates an entity and returns a standardized API response.
     * @param id The ID of the entity.
     * @param updateDto DTO for updating the entity.
     * @returns A standardized API response with the updated entity's DTO.
     * @example
     * ```typescript
     * // In a controller
     * return service.updateApi('some-uuid-v4', { firstName: 'John' });
     * ```
     */
    updateApi: (id: string, updateDto: TUpdateDto) => Promise<IApiResponse<TResponseDto>>;

    /**
     * Removes an entity and returns a standardized API response.
     * @param id The ID of the entity.
     * @returns A standardized API response with null data.
     * @example
     * ```typescript
     * // In a controller
     * return service.removeApi('some-uuid-v4');
     * ```
     */
    removeApi: (id: string) => Promise<IApiResponse<null>>;
}
