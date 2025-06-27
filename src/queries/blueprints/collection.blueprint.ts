import { map, startCase } from 'lodash';

import {
    STRING_OPERATORS,
    NUMBER_OPERATORS,
    DATE_OPERATORS,
    ENUM_OPERATORS,
} from '@/common/query-builder/operators.constants';
import { BlueprintDefinition, QueryBlueprint } from '@/common/query-builder/query-blueprint.base';
import { COLLECTION_TYPE, FontCollection } from '@/modules/collections/entities/collection.entity';

export class FontCollectionQueryBlueprint extends QueryBlueprint<FontCollection> {
    readonly name = 'FONT_COLLECTION_MANAGEMENT';

    protected readonly definition: BlueprintDefinition<FontCollection> = {
        model: FontCollection,
        fields: {
            // id: string
            id: {
                type: 'text',
                label: 'Id',
                operators: [STRING_OPERATORS.CONTAINS, STRING_OPERATORS.EQUALS],
            },
            // name: string
            name: {
                type: 'text',
                label: 'Name',
                operators: [STRING_OPERATORS.CONTAINS, STRING_OPERATORS.EQUALS],
            },
            // slug: string
            slug: {
                type: 'text',
                label: 'Slug',
                operators: [STRING_OPERATORS.CONTAINS, STRING_OPERATORS.EQUALS],
            },
            // description: string
            description: {
                type: 'text',
                label: 'Description',
                operators: [STRING_OPERATORS.CONTAINS, STRING_OPERATORS.EQUALS],
            },
            // coverImageUrl: string
            coverImageUrl: {
                type: 'text',
                label: 'Cover Image Url',
                operators: [STRING_OPERATORS.CONTAINS, STRING_OPERATORS.EQUALS],
            },
            // creatorId: string
            creatorId: {
                type: 'text',
                label: 'Creator Id',
                operators: [STRING_OPERATORS.CONTAINS, STRING_OPERATORS.EQUALS],
            },
            // collectionType: CollectionType
            collectionType: {
                type: 'select',
                label: 'Collection Type',
                operators: [ENUM_OPERATORS.EQUALS, ENUM_OPERATORS.IN],

                fieldSettings: {
                    defaultValue: [COLLECTION_TYPE.FREE, COLLECTION_TYPE.VIP, COLLECTION_TYPE.PAID],
                    listValues: map(COLLECTION_TYPE, (v) => ({ title: startCase(v), value: v })),
                },
            },
            // price: number
            price: {
                type: 'number',
                label: 'Price',
                operators: [NUMBER_OPERATORS.EQUALS, NUMBER_OPERATORS.GTE, NUMBER_OPERATORS.LTE],
            },
            // downloadCount: number
            downloadCount: {
                type: 'number',
                label: 'Download Count',
                operators: [NUMBER_OPERATORS.EQUALS, NUMBER_OPERATORS.GTE, NUMBER_OPERATORS.LTE],
            },
            // isActive: boolean
            isActive: {
                type: 'select',
                label: 'Is Active',
                operators: [ENUM_OPERATORS.EQUALS],

                fieldSettings: {
                    listValues: [
                        { title: 'Yes', value: true },
                        { title: 'No', value: false },
                    ],
                },
            },
            // metadata: Record&lt;string, any&gt;
            metadata: {
                type: 'text',
                label: 'Metadata',
                operators: [STRING_OPERATORS.CONTAINS, STRING_OPERATORS.EQUALS],
            },
            // createdAt: Date
            createdAt: {
                type: 'datetime',
                label: 'Created At',
                operators: [DATE_OPERATORS.BETWEEN, DATE_OPERATORS.GTE, DATE_OPERATORS.LTE],
            },
            // updatedAt: Date
            updatedAt: {
                type: 'datetime',
                label: 'Updated At',
                operators: [DATE_OPERATORS.BETWEEN, DATE_OPERATORS.GTE, DATE_OPERATORS.LTE],
            },
        },
        // Suggested sortable fields based on entity properties
        sortableFields: [
            'id',
            'name',
            'slug',
            'description',
            'coverImageUrl',
            'creatorId',
            'collectionType',
            'price',
            'downloadCount',
            'isActive',
            'metadata',
            'createdAt',
            'updatedAt',
        ],
        // Suggested selectable fields based on entity properties
        selectableFields: [
            'id',
            'name',
            'slug',
            'description',
            'coverImageUrl',
            'creatorId',
            'collectionType',
            'price',
            'downloadCount',
            'isActive',
            'metadata',
            'createdAt',
            'updatedAt',
        ],
        // TODO: Define the default sort order
        defaultSort: [['createdAt', 'DESC']],
        relations: {
            // creator: User
            // 'creator': {
            //   model: User, // <-- Adjust if needed
            //   fields: {
            //     // Define queryable fields from the User entity here
            //     // 'some_field_from_user': { operators: [Operator.EQUALS] },
            //   },
            // categories: Category[]
            // 'categories': {
            //   model: Category, // <-- Adjust if needed
            //   fields: {
            //     // Define queryable fields from the Category entity here
            //     // 'some_field_from_category': { operators: [Operator.EQUALS] },
            //   },
            // collectionFonts: CollectionFont[]
            // 'collectionFonts': {
            //   model: CollectionFont, // <-- Adjust if needed
            //   fields: {
            //     // Define queryable fields from the CollectionFont entity here
            //     // 'some_field_from_collectionfont': { operators: [Operator.EQUALS] },
            //   },
        },
    };
}
