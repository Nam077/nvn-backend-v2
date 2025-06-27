import { NUMBER_OPERATORS, STRING_OPERATORS } from '@/common/query-builder/operators.constants';
import { BlueprintDefinition, QueryBlueprint } from '@/common/query-builder/query-blueprint.base';
import { Category } from '@/modules/categories/entities/category.entity';

export class CategoryQueryBlueprint extends QueryBlueprint<Category> {
    readonly name = 'CATEGORY_MANAGEMENT';

    protected readonly definition: BlueprintDefinition<Category> = {
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
            level: {
                type: 'number',
                operators: [NUMBER_OPERATORS.EQUALS, NUMBER_OPERATORS.GT, NUMBER_OPERATORS.LT],
                sortable: true,
                selectable: true,
            },
        },
    };
}
