import { Module } from '@nestjs/common';

import { TasksService } from './tasks.service';
import { DatabaseModule } from '../database/database.module';

@Module({
    imports: [DatabaseModule],
    providers: [TasksService],
    exports: [TasksService],
})
export class TasksModule {}
