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

    // JWT Configuration
    JWT_SECRET: string;
    JWT_EXPIRES_IN: string;

    // Swagger Configuration
    SWAGGER_TITLE: string;
    SWAGGER_DESCRIPTION: string;
    SWAGGER_VERSION: string;
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

    // JWT Configuration
    JWT_SECRET: Joi.string().min(32).required(),
    JWT_EXPIRES_IN: Joi.string().default('7d'),

    // Swagger Configuration
    SWAGGER_TITLE: Joi.string().default('API Documentation'),
    SWAGGER_DESCRIPTION: Joi.string().default('API Documentation'),
    SWAGGER_VERSION: Joi.string().default('1.0'),
});
