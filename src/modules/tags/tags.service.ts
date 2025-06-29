import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import { isUUID } from 'class-validator';
import { filter, includes, map } from 'lodash';
import { Op } from 'sequelize';
import slugify from 'slugify';

import { Tag } from './entities/tag.entity';

@Injectable()
export class TagsService {
    constructor(
        @InjectModel(Tag)
        private readonly tagModel: typeof Tag,
    ) {}

    /**
     * Finds existing tags or creates new ones from a list of names.
     * This method is "upsert" (update/insert) aware. It prevents creating duplicate tags.
     * @param tagNames - An array of strings representing the tag names.
     * @returns A promise that resolves to an array of Tag instances.
     */
    async findOrCreateByName(tagNames: string[]): Promise<Tag[]> {
        if (!tagNames || tagNames.length === 0) {
            return [];
        }

        const slugs = map(tagNames, (name) => slugify(name, { lower: true, strict: true }));

        const existingTags = await this.tagModel.findAll({
            where: {
                slug: {
                    [Op.in]: slugs,
                },
            },
        });

        const existingSlugs = map(existingTags, 'slug');
        const newTagsToCreate = map(
            filter(tagNames, (name) => {
                const slug = slugify(name, { lower: true, strict: true });
                return !includes(existingSlugs, slug);
            }),
            (name) => ({
                name,
                slug: slugify(name, { lower: true, strict: true }),
            }),
        );

        if (newTagsToCreate.length > 0) {
            const createdTags = await this.tagModel.bulkCreate(newTagsToCreate);
            return [...existingTags, ...createdTags];
        }

        return existingTags;
    }

    async getTagIdsFromMixedArray(tags: string[]): Promise<string[]> {
        if (!tags || tags.length === 0) {
            return [];
        }

        const tagIds = filter(tags, (tag) => isUUID(tag));
        const tagNames = filter(tags, (tag) => !isUUID(tag));

        if (tagNames.length === 0) {
            return tagIds;
        }

        const foundOrCreatedTags = await this.findOrCreateByName(tagNames);
        const newTagIds = map(foundOrCreatedTags, 'id');

        return [...new Set([...tagIds, ...newTagIds])];
    }
}
