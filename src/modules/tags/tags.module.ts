import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { Tag } from './entities/tag.entity';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';

@Module({
    imports: [SequelizeModule.forFeature([Tag])],
    controllers: [TagsController],
    providers: [TagsService],
    exports: [TagsService],
})
export class TagsModule {}
