import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import { filter, get, includes, isEmpty, map } from 'lodash';
import { Op, Transaction } from 'sequelize';

import { FontGalleryImageDto } from '@/modules/fonts/dto/font.response.dto';

import { File } from '../entities/file.entity';

@Injectable()
export class FileService {
    constructor(
        @InjectModel(File)
        private readonly fileModel: typeof File,
    ) {}

    async checkFileExistsByIds(fileIds: string[], transaction?: Transaction): Promise<string[]> {
        if (isEmpty(fileIds)) {
            return [];
        }

        const files = await this.fileModel.findAll<File>({
            attributes: ['id'],
            where: {
                id: {
                    [Op.in]: fileIds,
                },
            },
            transaction,
        });
        return map(files, 'id');
    }

    async checkExists(
        fontGalleryImageDtos: FontGalleryImageDto[],
        transaction?: Transaction,
    ): Promise<FontGalleryImageDto[]> {
        const fileIds = map(
            filter(fontGalleryImageDtos, (item) => get(item, 'type') === 'entity' && !!get(item, 'fileId')),
            (item) => get(item, 'fileId'),
        );
        const existingFileIds = await this.checkFileExistsByIds(fileIds, transaction);

        return filter(fontGalleryImageDtos, (item) => {
            if (get(item, 'type') === 'url') {
                return true;
            }
            if (get(item, 'type') === 'entity' && get(item, 'fileId')) {
                return includes(existingFileIds, get(item, 'fileId'));
            }
            return false;
        });
    }

    async checkFileExists(fileId: string, transaction?: Transaction): Promise<boolean> {
        const file = await this.fileModel.findByPk<File>(fileId, { transaction });
        return !!file;
    }
}
