import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import bluebird from 'bluebird';
import { isUUID } from 'class-validator';
import { filter, isEmpty, map, size, trim, uniq } from 'lodash';
import { Op, Transaction } from 'sequelize';
import slugify from 'slugify';

import { Tag } from './entities/tag.entity';

@Injectable()
export class TagsService {
    constructor(
        @InjectModel(Tag)
        private readonly tagModel: typeof Tag,
    ) {}

    async findByIds(ids: string[], transaction?: Transaction): Promise<Tag[]> {
        return this.tagModel.findAll({ where: { id: { [Op.in]: ids } }, transaction });
    }

    async findOrCreateByName(name: string, transaction?: Transaction): Promise<Tag> {
        const [tag] = await this.tagModel.findOrCreate({
            where: { name: trim(name) },
            defaults: { name: trim(name), slug: slugify(name, { lower: true, strict: true }) },
            transaction,
        });
        return tag;
    }

    async getTagIdsFromMixedArray(tags: string[], transaction?: Transaction): Promise<string[]> {
        if (isEmpty(tags)) {
            return [];
        }

        let existingTagIds = filter(tags, (tag) => isUUID(tag));
        if (size(existingTagIds) > 0) {
            const existingTags = await this.findByIds(existingTagIds, transaction);
            existingTagIds = map(existingTags, 'id');
        }

        const newTagNames = filter(tags, (tag) => !isUUID(tag));

        let createdTagIds: string[] = [];
        if (size(newTagNames) > 0) {
            const newTags = await bluebird.map(newTagNames, (name) => this.findOrCreateByName(name, transaction), {
                concurrency: 10,
            });
            createdTagIds = map(newTags, 'id');
        }

        return uniq([...existingTagIds, ...createdTagIds]);
    }

    async findByName(name: string, transaction?: Transaction): Promise<Tag> {
        return this.tagModel.findOne({ where: { name }, transaction });
    }
}
