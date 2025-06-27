import { STRING_OPERATORS, DATE_OPERATORS, ENUM_OPERATORS } from '@/common/query-builder/operators.constants';
import { BlueprintDefinition, QueryBlueprint } from '@/common/query-builder/query-blueprint.base';
import { Permission } from '@/modules/users/entities/permission.entity';

export class PermissionQueryBlueprint extends QueryBlueprint<Permission> {
    readonly name = 'PERMISSION_MANAGEMENT';

    protected readonly definition: BlueprintDefinition<Permission> = {
        model: Permission,
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
            // description: string
            description: {
                type: 'text',
                label: 'Description',
                operators: [STRING_OPERATORS.CONTAINS, STRING_OPERATORS.EQUALS],
            },
            // resource: string
            resource: {
                type: 'text',
                label: 'Resource',
                operators: [STRING_OPERATORS.CONTAINS, STRING_OPERATORS.EQUALS],
            },
            // action: string
            action: {
                type: 'text',
                label: 'Action',
                operators: [STRING_OPERATORS.CONTAINS, STRING_OPERATORS.EQUALS],
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
        sortableFields: ['id', 'name', 'description', 'resource', 'action', 'isActive', 'createdAt', 'updatedAt'],
        // Suggested selectable fields based on entity properties
        selectableFields: ['id', 'name', 'description', 'resource', 'action', 'isActive', 'createdAt', 'updatedAt'],
        // TODO: Define the default sort order
        defaultSort: [['createdAt', 'DESC']],
        relations: {
            // roles: Role[]
            // 'roles': {
            //   model: Role, // <-- Adjust if needed
            //   fields: {
            //     // Define queryable fields from the Role entity here
            //     // 'some_field_from_role': { operators: [Operator.EQUALS] },
            //   },
        },
    };
}
