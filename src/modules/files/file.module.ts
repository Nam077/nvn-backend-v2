import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { File } from '@/modules/files/entities/file.entity';
import { FileService } from '@/modules/files/services/file.service';
import { RedisModule } from '@/modules/redis/redis.module';

@Module({
    imports: [RedisModule, SequelizeModule.forFeature([File])],
    providers: [FileService],
    exports: [FileService],
})
export class FileModule {}
