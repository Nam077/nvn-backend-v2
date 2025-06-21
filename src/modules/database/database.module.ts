import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { ConfigService } from '../config/config.service';

@Module({
    imports: [
        SequelizeModule.forRootAsync({
            useFactory: (configService: ConfigService) => ({
                dialect: 'postgres',
                host: configService.dbHost,
                port: configService.dbPort,
                username: configService.dbUsername,
                password: configService.dbPassword,
                database: configService.dbName,
                autoLoadModels: true,
                synchronize: configService.isDevelopment,
                // eslint-disable-next-line no-console
                logging: configService.isDevelopment ? console.log : false,
                pool: {
                    max: 10,
                    min: 0,
                    acquire: 30000,
                    idle: 10000,
                },
            }),
            inject: [ConfigService],
        }),
    ],
})
export class DatabaseModule {}
