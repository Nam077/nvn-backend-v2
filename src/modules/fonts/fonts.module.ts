import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';

import { CategoriesModule } from '@/modules/categories/categories.module';
import { Category } from '@/modules/categories/entities/category.entity';
import { CollectionCategory } from '@/modules/collections/entities/collection-category.entity';
import { CollectionFont } from '@/modules/collections/entities/collection-font.entity';
import { FontCollection } from '@/modules/collections/entities/collection.entity';
import { File } from '@/modules/files/entities/file.entity';
import { Font } from '@/modules/fonts/entities/font.entity';
import { FontsController } from '@/modules/fonts/fonts.controller';
import { FontsService } from '@/modules/fonts/fonts.service';
import { TagsModule } from '@/modules/tags/tags.module';
import { UsersModule } from '@/modules/users/users.module';

import { FontCategory } from './entities/font-category.entity';
import { FontTag } from './entities/font-tag.entity';
import { FontWeight } from './entities/font-weight.entity';

@Module({
    imports: [
        UsersModule,
        TagsModule,
        CategoriesModule,
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
        ]),
    ],
    controllers: [FontsController],
    providers: [FontsService],
    exports: [FontsService],
})
export class FontsModule {}
