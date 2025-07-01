import { Module } from '@nestjs/common';

import { TasksService } from './tasks.service';
import { ConfigModule } from '../config/config.module';
import { DatabaseModule } from '../database/database.module';

@Module({
    imports: [ConfigModule, DatabaseModule],
    providers: [TasksService],
    exports: [TasksService],
})
export class TasksModule {}
