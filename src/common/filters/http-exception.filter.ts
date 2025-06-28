import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { ConfigServiceApp } from '@/modules/config/config.service';

import { ErrorResponseDto } from '../dto/error.response.dto';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    constructor(private readonly configService: ConfigServiceApp) {}

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

        const errorResponse =
            exception instanceof HttpException
                ? (exception.getResponse() as string | { error: string; message: string | string[] })
                : {
                      error: 'Internal Server Error',
                      message: (exception as Error).message || 'An unexpected error occurred',
                  };

        const correlationId = (request.headers['x-correlation-id'] as string) || uuidv4();
        if (!response.headersSent) {
            response.setHeader('x-correlation-id', correlationId);
        }

        const errorPayload: ErrorResponseDto = {
            statusCode: status,
            error: typeof errorResponse === 'string' ? errorResponse : errorResponse.error,
            message: typeof errorResponse === 'string' ? errorResponse : errorResponse.message,
            path: request.url,
            timestamp: new Date().toISOString(),
            correlationId,
        };

        const isDevelopment = this.configService.nodeEnv === 'development';
        if (isDevelopment && exception instanceof Error) {
            errorPayload.stack = exception.stack;
        }

        this.logger.error(
            `[${correlationId}] Status: ${status} | Path: ${request.method} ${request.url}`,
            exception instanceof Error ? exception.stack : JSON.stringify(exception),
        );

        response.status(status).json(errorPayload);
    }
}
