import { map, startCase } from 'lodash';

import {
    BOOLEAN_OPERATORS,
    DATE_OPERATORS,
    ENUM_OPERATORS,
    NUMBER_OPERATORS,
    STRING_OPERATORS,
} from '@/common/query-builder/operators.constants';
import { BlueprintDefinition, QueryBlueprint } from '@/common/query-builder/query-blueprint.base';
import { Category } from '@/modules/categories/entities/category.entity';
import { FONT_TYPE, Font } from '@/modules/fonts/entities/font.entity';

export class FontQueryBlueprint extends QueryBlueprint<Font> {
    readonly name = 'FONT_MANAGEMENT';

    protected readonly definition: BlueprintDefinition<Font> = {
        model: Font,
        fields: {
            name: {
                type: 'text',
                operators: [STRING_OPERATORS.CONTAINS, STRING_OPERATORS.EQUALS],
            },
            slug: {
                type: 'text',
                operators: [STRING_OPERATORS.EQUALS],
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
        relations: {
            categories: {
                model: Category,
                fields: {
                    name: {
                        operators: [STRING_OPERATORS.EQUALS],
                    },
                    slug: {
                        operators: [STRING_OPERATORS.EQUALS],
                    },
                },
            },
        },
        selectableFields: ['id', 'name', 'slug', 'fontType', 'price', 'downloadCount', 'isActive', 'createdAt'],
        sortableFields: ['name', 'price', 'downloadCount', 'createdAt', 'updatedAt'],
        defaultSort: [['createdAt', 'DESC']],
    };
}
