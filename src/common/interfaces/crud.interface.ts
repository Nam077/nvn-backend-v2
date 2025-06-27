import { FindOptions, Transaction, WhereOptions } from 'sequelize';

// --- Base & Utility Types ---

export interface TransactionOption {
    transaction?: Transaction;
}

/**
 * Represents a JSON Logic rule object.
 * This should be validated securely before use.
 */
export type JsonLogicRule = Record<string, any>;

// --- Page-based Pagination (Advanced with Search & JSON Logic Filtering) ---

/**
 * DTO for page-based pagination, including search and structured filtering.
 */
export interface PagePaginationDto<T> {
    page?: number;
    limit?: number;
    /**
     * Global text search across multiple fields.
     */
    search?: string;
    /**
     * A JSON Logic object for complex, dynamic filtering.
     */
    filter?: JsonLogicRule;
    /**
     * Sorting criteria, using 0 for ASC and 1 for DESC.
     * E.g., [['createdAt', -1], ['name', 1]] for ORDER BY createdAt DESC, name ASC.
     */
    sort?: [keyof T | string, -1 | 1][];
}

/**
 * Result object for page-based pagination.
 */
export interface PagePaginatedResult<T> {
    items: T[];
    meta: {
        totalItems: number;
        itemCount: number;
        itemsPerPage: number;
        totalPages: number;
        currentPage: number;
    };
}

// --- Cursor-based Pagination (High Performance with Search & Filtering) ---

/**
 * DTO for cursor-based pagination, including search and structured filtering.
 */
export interface CursorPaginationDto<FilterDto = JsonLogicRule> {
    limit?: number;
    cursor?: string;
    /**
     * Global text search across multiple fields.
     */
    search?: string;
    /**
     * Structured filter object for specific field filtering.
     */
    filter?: FilterDto;
}

/**
 * Result object for cursor-based pagination.
 */
export interface CursorPaginatedResult<T> {
    items: T[];
    meta: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor: string | null;
        endCursor: string | null;
        totalItems?: number;
    };
}

// --- Repository Interfaces (CQRS-inspired) ---

/**
 * Interface for read-only repository operations.
 */
export interface IReadRepository<T, FilterDto = JsonLogicRule, ID = string> {
    /**
     * Find all entities matching a filter.
     */
    findAll: (options?: PagePaginationDto<T>) => Promise<T[]>;

    /**
     * Find all entities with pagination.
     */
    findAllPagePaginated: (pagination: PagePaginationDto<T>) => Promise<PagePaginatedResult<T>>;

    /**
     * Find all entities with pagination.
     */
    findAllCursorPaginated: (pagination: CursorPaginationDto<FilterDto>) => Promise<CursorPaginatedResult<T>>;

    /**
     * Find an entity by its primary key.
     */
    findById: (id: ID, options?: Omit<FindOptions, 'where'>) => Promise<T | null>;

    /**
     * Find a single entity matching a where clause.
     */
    findOneBy: (where: WhereOptions<T>, options?: Omit<FindOptions, 'where'>) => Promise<T | null>;

    /**
     * Find multiple entities matching a where clause.
     */
    findBy: (where: WhereOptions<T>, options?: Omit<FindOptions, 'where'>) => Promise<T[]>;

    /**
     * Count entities matching a filter.
     */
    count: (filter?: FilterDto) => Promise<number>;

    /**
     * Check if an entity exists.
     */
    exists: (where: WhereOptions<T>) => Promise<boolean>;
}

/**
 * Interface for write-only repository operations.
 */
export interface IWriteRepository<T, CreateDto, UpdateDto, ID = string> {
    /**
     * Create a new entity.
     */
    create: (data: CreateDto, options?: TransactionOption) => Promise<T>;

    /**
     * Create multiple entities in bulk.
     */
    bulkCreate: (data: CreateDto[], options?: TransactionOption) => Promise<T[]>;

    /**
     * Update an entity by its primary key.
     */
    update: (id: ID, data: UpdateDto, options?: TransactionOption) => Promise<T | null>;

    /**
     * Create a new entity or update an existing one.
     */
    upsert: (data: CreateDto | UpdateDto, options?: TransactionOption) => Promise<[T, boolean | null]>;

    /**
     * Delete an entity by its primary key.
     */
    delete: (id: ID, options?: TransactionOption) => Promise<boolean>;

    /**
     * Delete multiple entities by their primary keys.
     */
    bulkDelete: (ids: ID[], options?: TransactionOption) => Promise<number>;
}

/**
 * A comprehensive CRUD repository interface.
 */
export interface ICrudRepository<T, CreateDto, UpdateDto, FilterDto = JsonLogicRule, ID = string>
    extends IReadRepository<T, FilterDto, ID>,
        IWriteRepository<T, CreateDto, UpdateDto, ID> {}

// --- Service Interface ---

/**
 * A comprehensive CRUD service interface.
 * Services should handle business logic, validation, and error handling (e.g., throwing exceptions).
 */
export interface ICrudService<T, CreateDto, UpdateDto, FilterDto = JsonLogicRule, ID = string> {
    create: (data: CreateDto) => Promise<T>;
    bulkCreate: (data: CreateDto[]) => Promise<T[]>;

    findAll: (options?: PagePaginationDto<T>) => Promise<T[]>;
    findAllPagePaginated: (pagination: PagePaginationDto<T>) => Promise<PagePaginatedResult<T>>;
    findAllCursorPaginated: (pagination: CursorPaginationDto<FilterDto>) => Promise<CursorPaginatedResult<T>>;

    findById: (id: ID) => Promise<T>;
    findOneBy: (where: WhereOptions<T>) => Promise<T>;

    update: (id: ID, data: UpdateDto) => Promise<T>;

    delete: (id: ID) => Promise<void>;
    bulkDelete: (ids: ID[]) => Promise<void>;

    /**
     * Executes a series of operations within a database transaction.
     */
    withTransaction: <R>(work: (transaction: Transaction) => Promise<R>) => Promise<R>;
}
