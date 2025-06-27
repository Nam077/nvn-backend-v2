import { map, upperCase } from 'lodash';

import {
    BOOLEAN_OPERATORS,
    DATE_OPERATORS,
    ENUM_OPERATORS,
    STRING_OPERATORS,
} from '@/common/query-builder/operators.constants';
import { BlueprintDefinition, QueryBlueprint } from '@/common/query-builder/query-blueprint.base';
import { Category } from '@/modules/categories/entities/category.entity';
import { FontCategory } from '@/modules/fonts/entities/font-category.entity';
import { FONT_TYPE, Font } from '@/modules/fonts/entities/font.entity';

export class FontCategoryQueryBlueprint extends QueryBlueprint<FontCategory> {
    readonly name = 'FONT_CATEGORY_MANAGEMENT';

    protected readonly definition: BlueprintDefinition<FontCategory> = {
        model: FontCategory,
        fields: {
            fontId: {
                type: 'text',
                operators: [STRING_OPERATORS.EQUALS, ENUM_OPERATORS.IN],
            },
            categoryId: {
                type: 'text',
                operators: [STRING_OPERATORS.EQUALS, ENUM_OPERATORS.IN],
            },
            isPrimary: {
                type: 'boolean',
                operators: [BOOLEAN_OPERATORS.EQUALS],
            },
            createdAt: {
                type: 'datetime',
                operators: [DATE_OPERATORS.BETWEEN, DATE_OPERATORS.GTE, DATE_OPERATORS.LTE],
            },
        },
        relations: {
            font: {
                model: Font,
                fields: {
                    name: {
                        type: 'text',
                        operators: [STRING_OPERATORS.CONTAINS, STRING_OPERATORS.EQUALS],
                    },
                    slug: {
                        type: 'text',
                        operators: [STRING_OPERATORS.EQUALS, ENUM_OPERATORS.IN],
                    },
                    fontType: {
                        type: 'select',
                        operators: [ENUM_OPERATORS.IN, ENUM_OPERATORS.EQUALS],
                        fieldSettings: {
                            listValues: map(FONT_TYPE, (v) => ({ title: upperCase(v), value: v })),
                        },
                    },
                },
            },
            category: {
                model: Category,
                fields: {
                    name: {
                        type: 'text',
                        operators: [STRING_OPERATORS.CONTAINS, STRING_OPERATORS.EQUALS],
                    },
                    slug: {
                        type: 'text',
                        operators: [STRING_OPERATORS.EQUALS, ENUM_OPERATORS.IN],
                    },
                },
            },
        },
        selectableFields: ['fontId', 'categoryId', 'isPrimary', 'createdAt'],
        sortableFields: ['createdAt', 'isPrimary'],
        defaultSort: [['createdAt', 'DESC']],
    };
}
