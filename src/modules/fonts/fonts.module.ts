import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { CategoriesModule } from '@/modules/categories/categories.module';
import { Category } from '@/modules/categories/entities/category.entity';
import { CollectionCategory } from '@/modules/collections/entities/collection-category.entity';
import { CollectionFont } from '@/modules/collections/entities/collection-font.entity';
import { FontCollection } from '@/modules/collections/entities/collection.entity';
import { File } from '@/modules/files/entities/file.entity';
import { FileModule } from '@/modules/files/file.module';
import { FontSyncController } from '@/modules/fonts/controllers/font-sync.controller';
import { FontSearch } from '@/modules/fonts/entities/font-search.entity';
import { Font } from '@/modules/fonts/entities/font.entity';
import { FontsController } from '@/modules/fonts/fonts.controller';
import { FontsService } from '@/modules/fonts/fonts.service';
import { FontSyncService } from '@/modules/fonts/services/font-sync.service';
import { TagsModule } from '@/modules/tags/tags.module';
import { UsersModule } from '@/modules/users/users.module';

import { FontIntegrityController } from './controllers/font-integrity.controller';
import { FontCategory } from './entities/font-category.entity';
import { FontTag } from './entities/font-tag.entity';
import { FontWeight } from './entities/font-weight.entity';
import { FontIntegrityService } from './services/font-integrity.service';
import { QueueModule } from '../queue/queue.module';

@Module({
    imports: [
        UsersModule,
        TagsModule,
        CategoriesModule,
        FileModule,
        QueueModule,
        SequelizeModule.forFeature([
            Font,
            FontWeight,
            FontCategory,
            FontTag,
            Category,
            CollectionFont,
            File,
            CollectionCategory,
            FontCollection,
            FontSearch,
        ]),
    ],
    controllers: [FontsController, FontIntegrityController, FontSyncController],
    providers: [FontsService, FontIntegrityService, FontSyncService],
    exports: [FontsService],
})
export class FontsModule {}
