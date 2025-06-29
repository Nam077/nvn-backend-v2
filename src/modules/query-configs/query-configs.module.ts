import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { QueryConfigsController } from './controllers/query-configs.controller';
import { QueryConfig } from './entities/query-config.entity';
import { QueryConfigsService } from './services/query-configs.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [SequelizeModule.forFeature([QueryConfig]), AuthModule, UsersModule],
    controllers: [QueryConfigsController],
    providers: [QueryConfigsService],
    exports: [QueryConfigsService],
})
export class QueryConfigsModule {}
