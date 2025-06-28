import { Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class Paging {
    @Expose()
    @ApiProperty({ example: 1, description: 'Current page number' })
    page: number;

    @Expose()
    @ApiProperty({ example: 10, description: 'Number of items per page' })
    limit: number;

    @Expose()
    @ApiProperty({ example: 100, description: 'Total number of items' })
    total: number;

    @Expose()
    @ApiProperty({ example: 10, description: 'Total number of pages' })
    totalPages: number;
}

/**
 * Interface for the standardized paginated API response structure.
 * @template T The type of the data items in the array.
 */
export interface IApiPaginatedResponse<T> {
    statusCode: number;
    message: string;
    data: T[];
    paging: Paging;
}

/**
 * A factory function to create a class for Swagger documentation of standardized paginated API responses.
 * @template T The type of the data items in the array.
 * @param itemType The class or type of the items in the data array.
 * @returns {Type<IApiPaginatedResponse<T>>} The class definition of the API paginated response.
 */
export const ApiPaginatedResponseDto = <T>(itemType: Type<T>) => {
    class PaginatedResponse implements IApiPaginatedResponse<T> {
        @ApiProperty({ example: 200, description: 'HTTP Status Code' })
        statusCode: number;

        @ApiProperty({ example: 'Success', description: 'A descriptive message for the result.' })
        message: string;

        @ApiProperty({ type: [itemType] })
        data: T[];

        @ApiProperty({ type: () => Paging })
        paging: Paging;
    }

    // Give the dynamically generated class a unique name for Swagger to avoid conflicts.
    Object.defineProperty(PaginatedResponse, 'name', {
        value: `ApiPaginatedResponseOf${itemType.name}`,
    });

    return PaginatedResponse;
};

// --- Cursor Pagination ---

@Exclude()
export class CursorPaging {
    @Expose()
    @ApiProperty({
        example: 'eyJjcmVhdGVkQXQiOiIyMDI0LTAxLTAxVDEyOjAwOjAwLjAwMFoiLCJpZCI6ImFhYmJjYyJ9',
        description: 'The cursor pointing to the next page of results.',
        nullable: true,
    })
    nextCursor: string | null;

    @Expose()
    @ApiProperty({ example: true, description: 'Indicates if there is a next page of results.' })
    hasNextPage: boolean;
}

export interface IApiCursorPaginatedResponse<T> {
    statusCode: number;
    message: string;
    data: T[];
    cursorPaging: CursorPaging;
}

export const ApiCursorPaginatedResponseDto = <T>(itemType: Type<T>) => {
    class CursorPaginatedResponse implements IApiCursorPaginatedResponse<T> {
        @ApiProperty({ example: 200 })
        statusCode: number;
        @ApiProperty({ example: 'Success' })
        message: string;
        @ApiProperty({ type: [itemType] })
        data: T[];
        @ApiProperty({ type: () => CursorPaging })
        cursorPaging: CursorPaging;
    }
    Object.defineProperty(CursorPaginatedResponse, 'name', { value: `ApiCursorPaginatedResponseOf${itemType.name}` });
    return CursorPaginatedResponse;
};
