import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { ConfigServiceApp } from '@/modules/config/config.service';

@Module({
    imports: [
        SequelizeModule.forRootAsync({
            useFactory: (configService: ConfigServiceApp) => ({
                dialect: 'postgres',
                host: configService.dbHost,
                port: configService.dbPort,
                username: configService.dbUsername,
                password: configService.dbPassword,
                database: configService.dbName,
                autoLoadModels: true,
                // synchronize: configService.isDevelopment,
                // eslint-disable-next-line no-console
                logging: configService.isDevelopment ? console.log : false,
                pool: {
                    max: 10,
                    min: 0,
                    acquire: 30000,
                    idle: 10000,
                },
            }),
            inject: [ConfigServiceApp],
        }),
    ],
    exports: [SequelizeModule],
})
export class DatabaseModule {}
