import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { QueueController } from './controllers/queue.controller';
import { FontUpdateQueue } from './entities/font-update-queue.entity';
import { QueueService } from './services/queue.service';

@Module({
    imports: [SequelizeModule.forFeature([FontUpdateQueue])],
    providers: [QueueService],
    controllers: [QueueController],
    exports: [QueueService],
})
export class QueueModule {}
