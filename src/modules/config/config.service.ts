import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

import { EnvironmentVariables } from '@/modules/config/config.validation';

@Injectable()
export class ConfigServiceApp {
    constructor(private readonly configService: NestConfigService<EnvironmentVariables>) {}

    // Database Configuration
    get dbHost(): string {
        return this.configService.get('DB_HOST');
    }

    get dbName(): string {
        return this.configService.get('DB_NAME');
    }

    get dbPassword(): string {
        return this.configService.get('DB_PASSWORD');
    }

    get dbPort(): number {
        return this.configService.get('DB_PORT');
    }

    get dbUsername(): string {
        return this.configService.get('DB_USERNAME');
    }

    // Redis Configuration
    get redisHost(): string {
        return this.configService.get('REDIS_HOST', 'localhost');
    }

    get redisPort(): number {
        return this.configService.get('REDIS_PORT', 6379);
    }

    get redisPassword(): string | undefined {
        return this.configService.get('REDIS_PASSWORD');
    }

    get redisDb(): number {
        return this.configService.get('REDIS_DB', 0);
    }

    get redisKeyPrefix(): string {
        return this.configService.get('REDIS_KEY_PREFIX', '');
    }

    get isDevelopment(): boolean {
        return this.nodeEnv === 'development';
    }
    get isProduction(): boolean {
        return this.nodeEnv === 'production';
    }
    get jwtExpiresIn(): string {
        return this.configService.get('JWT_EXPIRES_IN');
    }

    // JWT Configuration
    get jwtSecret(): string {
        return this.configService.get('JWT_SECRET');
    }

    get nodeEnv(): string {
        return this.configService.get('NODE_ENV');
    }

    // Application Configuration
    get port(): number {
        return this.configService.get('PORT');
    }

    get swaggerDescription(): string {
        return this.configService.get('SWAGGER_DESCRIPTION');
    }

    // Swagger Configuration
    get swaggerTitle(): string {
        return this.configService.get('SWAGGER_TITLE');
    }

    get swaggerVersion(): string {
        return this.configService.get('SWAGGER_VERSION');
    }
}
