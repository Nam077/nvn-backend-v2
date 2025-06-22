import * as Joi from 'joi';

export interface EnvironmentVariables {
    // Application Configuration
    NODE_ENV: 'development' | 'production' | 'test';
    PORT: number;

    // Database Configuration
    DB_HOST: string;
    DB_PORT: number;
    DB_USERNAME: string;
    DB_PASSWORD: string;
    DB_NAME: string;
    DATABASE_URL?: string;

    // JWT Configuration
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;

    // Security Keys Configuration (Simple)
    SECURITY_MASTER_KEY: string;

    // Swagger Configuration
    SWAGGER_TITLE: string;
    SWAGGER_DESCRIPTION: string;
    SWAGGER_VERSION: string;

    // Redis Configuration
    REDIS_HOST: string;
    REDIS_PORT: number;
    REDIS_PASSWORD: string;
    REDIS_DB: number;
    REDIS_KEY_PREFIX: string;
}

export const validate = (config: Record<string, unknown>): EnvironmentVariables => {
    const result = validationSchema.validate(config, {
        allowUnknown: true,
        abortEarly: false,
    });

    if (result.error) {
        throw new Error(`Config validation error: ${result.error.message}`);
    }

    return result.value as EnvironmentVariables;
};

export const validationSchema = Joi.object({
    // Application Configuration
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    PORT: Joi.number().port().default(3000),

    // Database Configuration
    DB_HOST: Joi.string().required(),
    DB_PORT: Joi.number().port().default(5432),
    DB_USERNAME: Joi.string().required(),
    DB_PASSWORD: Joi.string().required(),
    DB_NAME: Joi.string().required(),
    DATABASE_URL: Joi.string().optional(),

    // JWT Configuration
    JWT_SECRET: Joi.string().min(32).required(),
    JWT_EXPIRES_IN: Joi.string().default('7d'),

    // Security Keys Configuration (Simple)
    SECURITY_MASTER_KEY: Joi.string().min(64).required().description('Master encryption key'),

    // Swagger Configuration
    SWAGGER_TITLE: Joi.string().default('API Documentation'),
    SWAGGER_DESCRIPTION: Joi.string().default('API Documentation'),
    SWAGGER_VERSION: Joi.string().default('1.0'),

    // Redis Configuration
    REDIS_HOST: Joi.string().default('localhost'),
    REDIS_PORT: Joi.number().port().default(6379),
    REDIS_PASSWORD: Joi.string().allow(''),
    REDIS_DB: Joi.number().default(0),
    REDIS_KEY_PREFIX: Joi.string().default(''),
});
