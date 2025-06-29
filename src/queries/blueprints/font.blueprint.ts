import { map, startCase } from 'lodash';

import {
    ARRAY_OPERATORS,
    BOOLEAN_OPERATORS,
    DATE_OPERATORS,
    ENUM_OPERATORS,
    NUMBER_OPERATORS,
    STRING_OPERATORS,
} from '@/common/query-builder/operators.constants';
import { BlueprintDefinition, QueryBlueprint } from '@/common/query-builder/query-blueprint.base';
import { Category } from '@/modules/categories/entities/category.entity';
import { File } from '@/modules/files/entities/file.entity';
import { FontWeight } from '@/modules/fonts/entities/font-weight.entity';
import { FONT_TYPE, Font } from '@/modules/fonts/entities/font.entity';
import { Tag } from '@/modules/tags/entities/tag.entity';
import { User } from '@/modules/users/entities/user.entity';

export class FontQueryBlueprint extends QueryBlueprint<Font> {
    readonly name = 'FONT_MANAGEMENT';

    protected readonly definition: BlueprintDefinition<Font> = {
        model: Font,
        fields: {
            name: {
                type: 'text',
                operators: [
                    STRING_OPERATORS.CONTAINS,
                    STRING_OPERATORS.EQUALS,
                    STRING_OPERATORS.STARTS_WITH,
                    STRING_OPERATORS.ENDS_WITH,
                    STRING_OPERATORS.IS_EMPTY,
                    STRING_OPERATORS.IS_NOT_EMPTY,
                ],
            },
            slug: {
                type: 'text',
                operators: [
                    STRING_OPERATORS.EQUALS,
                    STRING_OPERATORS.STARTS_WITH,
                    STRING_OPERATORS.ENDS_WITH,
                    STRING_OPERATORS.IS_EMPTY,
                    STRING_OPERATORS.IS_NOT_EMPTY,
                ],
            },
            fontType: {
                type: 'select',
                label: 'Font Type',
                operators: [ENUM_OPERATORS.IN, ENUM_OPERATORS.EQUALS],
                fieldSettings: {
                    defaultValue: [FONT_TYPE.FREE, FONT_TYPE.VIP],
                    listValues: map(FONT_TYPE, (v) => ({ title: startCase(v), value: v })),
                },
            },
            price: {
                type: 'number',
                operators: [NUMBER_OPERATORS.GTE, NUMBER_OPERATORS.LTE, NUMBER_OPERATORS.BETWEEN],
            },
            downloadCount: {
                type: 'number',
                label: 'Download Count',
                operators: [NUMBER_OPERATORS.GTE, NUMBER_OPERATORS.LTE],
            },
            isActive: {
                type: 'boolean',
                operators: [BOOLEAN_OPERATORS.EQUALS],
                fieldSettings: {
                    defaultValue: true,
                },
            },
            createdAt: {
                type: 'datetime',
                label: 'Creation Date',
                operators: [DATE_OPERATORS.BETWEEN, DATE_OPERATORS.GTE],
            },
            updatedAt: {
                type: 'datetime',
                label: 'Last Updated',
                operators: [DATE_OPERATORS.BETWEEN, DATE_OPERATORS.GTE],
            },
        },
        customFields: {
            'authors.name': {
                type: 'text',
                label: 'Author Name',
                operators: [STRING_OPERATORS.CONTAINS],
            },
        },
        relations: {
            categories: {
                model: Category,
                fields: {
                    id: {
                        type: 'remote_multiselect',
                        label: 'Category',
                        operators: [ARRAY_OPERATORS.OVERLAPS],
                        remoteValues: {
                            blueprint: 'CATEGORY_MANAGEMENT',
                            valueField: 'id',
                            labelField: 'name',
                        },
                    },
                    name: {
                        type: 'text',
                        label: 'Category Name',
                        operators: [STRING_OPERATORS.CONTAINS],
                    },
                },
            },
            tags: {
                model: Tag,
                fields: {
                    id: {
                        type: 'remote_multiselect',
                        label: 'Tag',
                        operators: [ARRAY_OPERATORS.OVERLAPS],
                        remoteValues: {
                            blueprint: 'TAG_MANAGEMENT',
                            valueField: 'id',
                            labelField: 'name',
                        },
                    },
                    name: {
                        type: 'text',
                        label: 'Tag Name',
                        operators: [STRING_OPERATORS.CONTAINS],
                    },
                },
            },
            creator: {
                model: User,
                fields: {
                    firstName: {
                        operators: [STRING_OPERATORS.CONTAINS],
                    },
                    lastName: {
                        operators: [STRING_OPERATORS.CONTAINS],
                    },
                    email: {
                        operators: [STRING_OPERATORS.EQUALS],
                    },
                },
            },
            weights: {
                model: FontWeight,
                fields: {
                    name: {
                        operators: [STRING_OPERATORS.EQUALS],
                    },
                    weight: {
                        operators: [NUMBER_OPERATORS.EQUALS, NUMBER_OPERATORS.GTE, NUMBER_OPERATORS.LTE],
                    },
                },
            },
            thumbnailFile: {
                model: File,
                fields: {},
            },
            previewImageFile: {
                model: File,
                fields: {},
            },
        },
        selectableFields: [
            'id',
            'name',
            'slug',
            'authors',
            'description',
            'fontType',
            'price',
            'downloadCount',
            'isActive',
            'createdAt',
            'updatedAt',
            'creator',
            'thumbnailFile',
            'previewImageFile',
            'categories',
            'tags',
            'weights',
            'weightCount',
        ],
        sortableFields: ['name', 'price', 'downloadCount', 'createdAt', 'updatedAt'],
        defaultSort: [['createdAt', 'DESC']],
    };
}
