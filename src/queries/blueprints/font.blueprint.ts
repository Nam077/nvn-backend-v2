import { map, startCase } from 'lodash';

import {
    BOOLEAN_OPERATORS,
    DATE_OPERATORS,
    ENUM_OPERATORS,
    NUMBER_OPERATORS,
    STRING_OPERATORS,
} from '@/common/query-builder/operators.constants';
import { BlueprintDefinition, QueryBlueprint } from '@/common/query-builder/query-blueprint.base';
import { FONT_TYPE, Font } from '@/modules/fonts/entities/font.entity';
import { CategoryQueryBlueprint } from '@/queries/blueprints/category.blueprint';

export class FontQueryBlueprint extends QueryBlueprint<Font> {
    readonly name = 'FONT_MANAGEMENT';

    protected readonly definition: BlueprintDefinition<Font> = {
        fields: {
            name: {
                type: 'text',
                operators: [STRING_OPERATORS.CONTAINS, STRING_OPERATORS.EQUALS],
                sortable: true,
                selectable: true,
            },
            slug: {
                type: 'text',
                operators: [STRING_OPERATORS.EQUALS],
                selectable: true,
            },
            fontType: {
                type: 'select',
                label: 'Font Type',
                operators: [ENUM_OPERATORS.IN, ENUM_OPERATORS.EQUALS],
                selectable: true,
                fieldSettings: {
                    defaultValue: [FONT_TYPE.FREE, FONT_TYPE.VIP],
                    listValues: map(FONT_TYPE, (v) => ({ title: startCase(v), value: v })),
                },
            },
            price: {
                type: 'number',
                operators: [NUMBER_OPERATORS.GTE, NUMBER_OPERATORS.LTE, NUMBER_OPERATORS.BETWEEN],
                sortable: true,
                selectable: true,
            },
            downloadCount: {
                type: 'number',
                label: 'Download Count',
                operators: [NUMBER_OPERATORS.GTE, NUMBER_OPERATORS.LTE],
                sortable: true,
                selectable: true,
            },
            isActive: {
                type: 'boolean',
                operators: [BOOLEAN_OPERATORS.EQUALS],
                selectable: true,
                fieldSettings: {
                    defaultValue: true,
                },
            },
            createdAt: {
                type: 'datetime',
                label: 'Creation Date',
                operators: [DATE_OPERATORS.BETWEEN, DATE_OPERATORS.GTE],
                sortable: true,
                selectable: true,
            },
            updatedAt: {
                type: 'datetime',
                label: 'Last Updated',
                operators: [DATE_OPERATORS.BETWEEN, DATE_OPERATORS.GTE],
                sortable: true,
                selectable: true,
            },
        },
        relations: {
            categories: {
                label: 'Categories',
                targetBlueprint: CategoryQueryBlueprint,
                fields: [{ name: 'name', operators: [STRING_OPERATORS.EQUALS] }, 'slug'],
            },
        },
    };
}
