import { Type } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptions } from '@nestjs/swagger';

/**
 * Interface for the standardized API response structure.
 * @template T The type of the data payload.
 */
export interface IApiResponse<T> {
    statusCode: number;
    message: string;
    data: T | null; // Allow null for responses like delete
}

/**
 * A factory function to create a class for Swagger documentation of standardized API responses.
 * This helps Swagger understand the generic `data` property.
 * @param {Type<T> | null} dataType The class or type of the data payload. Pass null for empty data response.
 * @returns {Type<IApiResponse<T>>} The class definition of the API response.
 */
export const ApiResponseDto = <T>(dataType: Type<T> | null) => {
    // This function determines the correct options for the @ApiProperty decorator
    // based on whether a data type is provided.
    const getApiPropertyOptions = (): ApiPropertyOptions => {
        if (dataType) {
            // If we have a data type, specify it
            return { type: dataType, nullable: true };
        }
        // If data type is null, we just indicate it can be null and provide an example
        return { nullable: true, example: null };
    };

    class ApiResponse implements IApiResponse<T> {
        @ApiProperty({ example: 200, description: 'HTTP Status Code' })
        statusCode: number;

        @ApiProperty({ example: 'Success', description: 'A descriptive message for the result.' })
        message: string;

        @ApiProperty(getApiPropertyOptions())
        data: T | null;
    }
    // Give the dynamically generated class a unique name for Swagger to avoid conflicts.
    const uniqueClassName = `ApiResponseOf${dataType ? dataType.name : 'Null'}`;
    Object.defineProperty(ApiResponse, 'name', { value: uniqueClassName });

    return ApiResponse;
};

/**
 * A concrete implementation class for creating standardized API responses within services.
 * @template T The type of the data payload.
 */
export class ApiResponse<T> implements IApiResponse<T> {
    statusCode: number;
    message: string;
    data: T;

    constructor(data: T, message = 'Success', statusCode = 200) {
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
    }
}
