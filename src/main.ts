/* eslint-disable no-console */
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import cookieParser from 'cookie-parser';

import { AppModule } from '@/app.module';
import { ConfigServiceApp } from '@/modules/config/config.service';

/**
 * Bootstrap the NestJS application
 */
const bootstrap = async (): Promise<void> => {
    const app = await NestFactory.create(AppModule);

    // Get config service
    const configService = app.get(ConfigServiceApp);

    // Enable cookie parser middleware
    app.use(cookieParser());

    // Enable CORS
    app.enableCors({
        origin: true,
        credentials: true,
    });

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    // Global prefix - Set BEFORE Swagger
    app.setGlobalPrefix('api');

    // Swagger configuration
    if (configService.isDevelopment) {
        const config = new DocumentBuilder()
            .setTitle(configService.swaggerTitle)
            .setDescription(configService.swaggerDescription)
            .setVersion(configService.swaggerVersion)
            .addBearerAuth()
            .addCookieAuth('nvn_refresh_token', {
                type: 'http',
                in: 'cookie',
                name: 'nvn_refresh_token',
                description: 'Refresh token stored in httpOnly cookie',
            })
            .addTag('Authentication', 'Authentication endpoints')
            .addTag('Users', 'User management endpoints')
            .addTag('Security', 'Security and key management endpoints')
            .build();

        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('docs', app, document, {
            swaggerOptions: {
                persistAuthorization: true,
            },
        });
    }

    await app.listen(configService.port);
    console.log(`Server is running on port ${configService.port}`);
    console.log(`Environment: ${configService.nodeEnv}`);
    if (configService.isDevelopment) {
        console.log(`📚 Swagger documentation: http://localhost:${configService.port}/docs`);
    }
};

void bootstrap();
