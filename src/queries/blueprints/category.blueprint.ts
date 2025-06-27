import { NUMBER_OPERATORS, STRING_OPERATORS } from '@/common/query-builder/operators.constants';
import { BlueprintDefinition, QueryBlueprint } from '@/common/query-builder/query-blueprint.base';
import { Category } from '@/modules/categories/entities/category.entity';

export class CategoryQueryBlueprint extends QueryBlueprint<Category> {
    readonly name = 'CATEGORY_MANAGEMENT';

    protected readonly definition: BlueprintDefinition<Category> = {
        model: Category,
        fields: {
            name: {
                type: 'text',
                operators: [STRING_OPERATORS.CONTAINS, STRING_OPERATORS.EQUALS],
            },
            slug: {
                type: 'text',
                operators: [STRING_OPERATORS.EQUALS],
            },
            level: {
                type: 'number',
                operators: [NUMBER_OPERATORS.EQUALS, NUMBER_OPERATORS.GT, NUMBER_OPERATORS.LT],
            },
        },
        selectableFields: ['id', 'name', 'slug', 'level', 'parentId', 'createdAt'],
        sortableFields: ['name', 'level', 'createdAt'],
        defaultSort: [['level', 'ASC']],
    };
}
