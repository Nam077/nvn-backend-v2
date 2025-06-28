import { applyDecorators, Type, HttpCode, HttpStatus } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiOkResponse,
    ApiOperation,
    ApiResponse,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { map, size, get } from 'lodash';

import { AuthType, AUTH_TYPE } from '../constants/auth.constants';
import { PaginationType, PAGINATION_TYPE } from '../constants/pagination.constants';
import { ApiResponseDto } from '../dto/api.response.dto';
import { ErrorResponseDto } from '../dto/error.response.dto';
import { ApiPaginatedResponseDto, ApiCursorPaginatedResponseDto } from '../dto/paginated.response.dto';

// --- Types for configuration ---

interface ApiEndpointOptions<T> {
    summary: string;
    description?: string;
    response: Type<T> | null;
    created?: boolean;
    paginationType?: PaginationType;
    auth?: {
        type: AuthType[];
    };
    errors?: HttpStatus[];
}

// --- Mapping for Swagger auth decorators ---

const AuthDecorators: Record<AuthType, MethodDecorator> = {
    [AUTH_TYPE.JWT]: ApiBearerAuth(),
};

/**
 * A decorator to standardize Swagger documentation and API response structure.
 * It combines ApiOperation, ApiOk/CreatedResponse, HttpCode,
 * and Swagger auth decorators into a single, configurable decorator.
 *
 * @param {ApiEndpointOptions<T>} options - The configuration for the endpoint's documentation.
 * @returns {MethodDecorator} - A decorator that applies the Swagger documentation and response structure.
 */
export const ApiEndpoint = <T>(options: ApiEndpointOptions<T>): MethodDecorator => {
    const { summary, description = '', response, created = false, paginationType, auth, errors } = options;

    const decorators: (MethodDecorator | ClassDecorator | PropertyDecorator)[] = [];

    // 1. Set HTTP Status Code
    const httpStatus = created ? 201 : 200;
    decorators.push(HttpCode(httpStatus));

    // 2. Set Swagger Operation Summary & Description
    decorators.push(ApiOperation({ summary, description }));

    // 3. Set Swagger Response Type
    const ResponseDecorator = created ? ApiCreatedResponse : ApiOkResponse;
    if (paginationType === PAGINATION_TYPE.OFFSET) {
        decorators.push(ResponseDecorator({ type: ApiPaginatedResponseDto(response) }));
    } else if (paginationType === PAGINATION_TYPE.CURSOR) {
        decorators.push(ResponseDecorator({ type: ApiCursorPaginatedResponseDto(response) }));
    } else {
        decorators.push(ResponseDecorator({ type: ApiResponseDto(response) }));
    }

    // 4. Apply Swagger Authentication Decorators
    if (auth && size(auth.type) > 0) {
        const authDecorators = map(auth.type, (type) => AuthDecorators[type as AuthType]);
        decorators.push(...authDecorators);

        // Automatically add 401 and 403 for authenticated endpoints
        decorators.push(ApiUnauthorizedResponse({ description: 'Unauthorized', type: ErrorResponseDto }));
        decorators.push(ApiForbiddenResponse({ description: 'Forbidden', type: ErrorResponseDto }));
    }

    // 5. Apply custom error responses
    if (errors && size(errors) > 0) {
        map(errors, (status) => {
            decorators.push(
                ApiResponse({
                    status,
                    description: get(HttpStatus, status, ''),
                    type: ErrorResponseDto,
                }),
            );
        });
    }

    return applyDecorators(...decorators);
};
