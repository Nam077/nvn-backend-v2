import {
    BOOLEAN_OPERATORS,
    DATE_OPERATORS,
    ENUM_OPERATORS,
    STRING_OPERATORS,
} from '@/common/query-builder/operators.constants';
import { BlueprintDefinition, QueryBlueprint } from '@/common/query-builder/query-blueprint.base';
import { FontCategory } from '@/modules/fonts/entities/font-category.entity';

export class FontCategoryQueryBlueprint extends QueryBlueprint<FontCategory> {
    readonly name = 'FONT_CATEGORY_MANAGEMENT';

    protected readonly definition: BlueprintDefinition<FontCategory> = {
        fields: {
            fontId: {
                type: 'text',
                operators: [STRING_OPERATORS.EQUALS, ENUM_OPERATORS.IN],
                selectable: true,
            },
            categoryId: {
                type: 'text',
                operators: [STRING_OPERATORS.EQUALS, ENUM_OPERATORS.IN],
                selectable: true,
            },
            isPrimary: {
                type: 'boolean',
                operators: [BOOLEAN_OPERATORS.EQUALS],
                selectable: true,
            },
            createdAt: {
                type: 'datetime',
                operators: [DATE_OPERATORS.BETWEEN, DATE_OPERATORS.GTE],
                sortable: true,
                selectable: true,
            },
        },
    };
}
