import { STRING_OPERATORS, NUMBER_OPERATORS, DATE_OPERATORS } from '@/common/query-builder/operators.constants';
import { BlueprintDefinition, QueryBlueprint } from '@/common/query-builder/query-blueprint.base';
import { CollectionFont } from '@/modules/collections/entities/collection-font.entity';

export class CollectionFontQueryBlueprint extends QueryBlueprint<CollectionFont> {
    readonly name = 'COLLECTION_FONT_MANAGEMENT';

    protected readonly definition: BlueprintDefinition<CollectionFont> = {
        model: CollectionFont,
        fields: {
            // collectionId: string
            collectionId: {
                type: 'text',
                label: 'Collection Id',
                operators: [STRING_OPERATORS.CONTAINS, STRING_OPERATORS.EQUALS],
            },
            // fontId: string
            fontId: {
                type: 'text',
                label: 'Font Id',
                operators: [STRING_OPERATORS.CONTAINS, STRING_OPERATORS.EQUALS],
            },
            // sortOrder: number
            sortOrder: {
                type: 'number',
                label: 'Sort Order',
                operators: [NUMBER_OPERATORS.EQUALS, NUMBER_OPERATORS.GTE, NUMBER_OPERATORS.LTE],
            },
            // addedAt: Date
            addedAt: {
                type: 'datetime',
                label: 'Added At',
                operators: [DATE_OPERATORS.BETWEEN, DATE_OPERATORS.GTE, DATE_OPERATORS.LTE],
            },
        },
        // Suggested sortable fields based on entity properties
        sortableFields: ['collectionId', 'fontId', 'sortOrder', 'addedAt'],
        // Suggested selectable fields based on entity properties
        selectableFields: ['collectionId', 'fontId', 'sortOrder', 'addedAt'],
        // TODO: Define the default sort order
        defaultSort: [['createdAt', 'DESC']],
        relations: {
            // collection: FontCollection
            // 'collection': {
            //   model: FontCollection, // <-- Adjust if needed
            //   fields: {
            //     // Define queryable fields from the FontCollection entity here
            //     // 'some_field_from_fontcollection': { operators: [Operator.EQUALS] },
            //   },
            // font: Font
            // 'font': {
            //   model: Font, // <-- Adjust if needed
            //   fields: {
            //     // Define queryable fields from the Font entity here
            //     // 'some_field_from_font': { operators: [Operator.EQUALS] },
            //   },
        },
    };
}
