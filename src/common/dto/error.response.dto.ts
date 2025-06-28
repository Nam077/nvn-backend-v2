import { ApiProperty } from '@nestjs/swagger';

/**
 * Defines the standardized shape for all API error responses.
 */
export class ErrorResponseDto {
    @ApiProperty({
        description: 'The HTTP status code.',
        example: 500,
    })
    statusCode: number;

    @ApiProperty({
        description: 'A short description of the error, e.g., "Internal Server Error".',
        example: 'Internal Server Error',
    })
    error: string;

    @ApiProperty({
        description: 'A detailed error message or an array of validation errors.',
        example: 'An unexpected error occurred while processing your request.',
    })
    message: string | string[];

    @ApiProperty({
        description: 'The path of the request that resulted in an error.',
        example: '/api/v1/fonts/query',
    })
    path: string;

    @ApiProperty({
        description: 'The timestamp when the error occurred.',
        example: '2023-10-27T10:00:00.000Z',
    })
    timestamp: string;

    @ApiProperty({
        description: 'A unique identifier for the request, useful for tracing and correlation in logs.',
        example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    })
    correlationId: string;

    @ApiProperty({
        description:
            'The stack trace of the error. This is only available in the development environment for security reasons.',
        example: 'Error: Something went wrong... at functionName (fileName:line:column)',
        required: false,
    })
    stack?: string;
}
