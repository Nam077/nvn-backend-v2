import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { ConfigService } from './modules/config/config.service';

/**
 * Bootstrap the NestJS application
 */
const bootstrap = async (): Promise<void> => {
    const app = await NestFactory.create(AppModule);

    // Get config service
    const configService = app.get(ConfigService);

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
            .addTag('Authentication', 'Authentication endpoints')
            .addTag('Users', 'User management endpoints')
            .build();

        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('docs', app, document, {
            swaggerOptions: {
                persistAuthorization: true,
            },
        });
    }

    await app.listen(configService.port);
};

void bootstrap();
