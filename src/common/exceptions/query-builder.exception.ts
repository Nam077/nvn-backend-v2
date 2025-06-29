import { BadRequestException } from '@nestjs/common';

/**
 * Custom exception for errors occurring during the query building process.
 * Extends BadRequestException to ensure a 400 status code is returned by default.
 */
export class QueryBuilderException extends BadRequestException {
    constructor(message: string) {
        super(message, 'QUERY_BUILDER_ERROR');
    }
}
