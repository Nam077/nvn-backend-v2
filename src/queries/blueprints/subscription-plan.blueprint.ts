import {
    STRING_OPERATORS,
    NUMBER_OPERATORS,
    DATE_OPERATORS,
    ENUM_OPERATORS,
} from '@/common/query-builder/operators.constants';
import { BlueprintDefinition, QueryBlueprint } from '@/common/query-builder/query-blueprint.base';
import { SubscriptionPlan } from '@/modules/subscription/entities/subscription-plan.entity';

export class SubscriptionPlanQueryBlueprint extends QueryBlueprint<SubscriptionPlan> {
    readonly name = 'SUBSCRIPTION_PLAN_MANAGEMENT';

    protected readonly definition: BlueprintDefinition<SubscriptionPlan> = {
        model: SubscriptionPlan,
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
            // basePrice: number
            basePrice: {
                type: 'number',
                label: 'Base Price',
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
            // sortOrder: number
            sortOrder: {
                type: 'number',
                label: 'Sort Order',
                operators: [NUMBER_OPERATORS.EQUALS, NUMBER_OPERATORS.GTE, NUMBER_OPERATORS.LTE],
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
            'basePrice',
            'isActive',
            'sortOrder',
            'createdAt',
            'updatedAt',
        ],
        // Suggested selectable fields based on entity properties
        selectableFields: [
            'id',
            'name',
            'slug',
            'description',
            'basePrice',
            'isActive',
            'sortOrder',
            'createdAt',
            'updatedAt',
        ],
        // TODO: Define the default sort order
        defaultSort: [['createdAt', 'DESC']],
        relations: {
            // durations: SubscriptionDuration[]
            // 'durations': {
            //   model: SubscriptionDuration, // <-- Adjust if needed
            //   fields: {
            //     // Define queryable fields from the SubscriptionDuration entity here
            //     // 'some_field_from_subscriptionduration': { operators: [Operator.EQUALS] },
            //   },
            // subscriptions: UserSubscription[]
            // 'subscriptions': {
            //   model: UserSubscription, // <-- Adjust if needed
            //   fields: {
            //     // Define queryable fields from the UserSubscription entity here
            //     // 'some_field_from_usersubscription': { operators: [Operator.EQUALS] },
            //   },
        },
    };
}
