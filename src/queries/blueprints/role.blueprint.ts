import {
    STRING_OPERATORS,
    NUMBER_OPERATORS,
    DATE_OPERATORS,
    ENUM_OPERATORS,
} from '@/common/query-builder/operators.constants';
import { BlueprintDefinition, QueryBlueprint } from '@/common/query-builder/query-blueprint.base';
import { Role } from '@/modules/users/entities/role.entity';

export class RoleQueryBlueprint extends QueryBlueprint<Role> {
    readonly name = 'ROLE_MANAGEMENT';

    protected readonly definition: BlueprintDefinition<Role> = {
        model: Role,
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
            // displayName: string
            displayName: {
                type: 'text',
                label: 'Display Name',
                operators: [STRING_OPERATORS.CONTAINS, STRING_OPERATORS.EQUALS],
            },
            // description: string
            description: {
                type: 'text',
                label: 'Description',
                operators: [STRING_OPERATORS.CONTAINS, STRING_OPERATORS.EQUALS],
            },
            // isActive: boolean
            isActive: {
                type: 'select',
                label: 'Is Active',
                operators: [ENUM_OPERATORS.EQUALS],
            },
            // priority: number
            priority: {
                type: 'number',
                label: 'Priority',
                operators: [NUMBER_OPERATORS.EQUALS, NUMBER_OPERATORS.GTE, NUMBER_OPERATORS.LTE],
            },
            // isSystem: boolean
            isSystem: {
                type: 'select',
                label: 'Is System',
                operators: [ENUM_OPERATORS.EQUALS],
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
            'displayName',
            'description',
            'isActive',
            'priority',
            'isSystem',
            'createdAt',
            'updatedAt',
        ],
        // Suggested selectable fields based on entity properties
        selectableFields: [
            'id',
            'name',
            'displayName',
            'description',
            'isActive',
            'priority',
            'isSystem',
            'createdAt',
            'updatedAt',
        ],
        // TODO: Define the default sort order
        defaultSort: [['createdAt', 'DESC']],
        relations: {
            // users: User[]
            // 'users': {
            //   model: User, // <-- Adjust if needed
            //   fields: {
            //     // Define queryable fields from the User entity here
            //     // 'some_field_from_user': { operators: [Operator.EQUALS] },
            //   },
            // permissions: Permission[]
            // 'permissions': {
            //   model: Permission, // <-- Adjust if needed
            //   fields: {
            //     // Define queryable fields from the Permission entity here
            //     // 'some_field_from_permission': { operators: [Operator.EQUALS] },
            //   },
        },
    };
}
