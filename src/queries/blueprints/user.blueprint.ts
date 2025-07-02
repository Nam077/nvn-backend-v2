import {
    ARRAY_OPERATORS,
    DATE_OPERATORS,
    ENUM_OPERATORS,
    STRING_OPERATORS,
} from '@/common/constants/operator.constants';
import { BlueprintDefinition, QueryBlueprint } from '@/common/query-builder/query-blueprint.base';
import { Permission } from '@/modules/users/entities/permission.entity';
import { Role } from '@/modules/users/entities/role.entity';
import { User } from '@/modules/users/entities/user.entity';

export class UserQueryBlueprint extends QueryBlueprint<User> {
    readonly name = 'USER_MANAGEMENT';

    protected readonly definition: BlueprintDefinition<User> = {
        model: User,
        fields: {
            email: {
                type: 'text',
                operators: [
                    STRING_OPERATORS.CONTAINS,
                    STRING_OPERATORS.EQUALS,
                    STRING_OPERATORS.STARTS_WITH,
                    STRING_OPERATORS.ENDS_WITH,
                    STRING_OPERATORS.IS_EMPTY,
                    STRING_OPERATORS.IS_NOT_EMPTY,
                ],
            },
            firstName: {
                type: 'text',
                operators: [STRING_OPERATORS.CONTAINS],
            },
            lastName: {
                type: 'text',
                operators: [STRING_OPERATORS.CONTAINS],
            },
            isActive: {
                type: 'select',
                operators: [ENUM_OPERATORS.EQUALS, ENUM_OPERATORS.IN],
                fieldSettings: {
                    defaultValue: true,
                    listValues: [
                        { title: 'Yes', value: true },
                        { title: 'No', value: false },
                    ],
                },
            },
            emailVerified: {
                type: 'select',
                operators: [ENUM_OPERATORS.EQUALS, ENUM_OPERATORS.IN],
                fieldSettings: {
                    listValues: [
                        { title: 'Yes', value: true },
                        { title: 'No', value: false },
                    ],
                },
            },
            createdAt: {
                type: 'datetime',
                label: 'Creation Date',
                operators: [DATE_OPERATORS.BETWEEN, DATE_OPERATORS.GTE],
            },
        },
        relations: {
            roles: {
                model: Role,
                fields: {
                    id: {
                        type: 'remote_multiselect',
                        label: 'Role',
                        operators: [ARRAY_OPERATORS.OVERLAPS],
                        remoteValues: {
                            blueprint: 'ROLE_MANAGEMENT',
                            valueField: 'id',
                            labelField: 'name',
                        },
                    },
                    name: {
                        type: 'text',
                        label: 'Role Name',
                        operators: [STRING_OPERATORS.CONTAINS],
                    },
                },
            },
            permissions: {
                model: Permission,
                fields: {
                    id: {
                        type: 'remote_multiselect',
                        label: 'Permission',
                        operators: [ARRAY_OPERATORS.OVERLAPS],
                        remoteValues: {
                            blueprint: 'PERMISSION_MANAGEMENT',
                            valueField: 'id',
                            labelField: 'name',
                        },
                    },
                    name: {
                        type: 'text',
                        label: 'Permission Name',
                        operators: [STRING_OPERATORS.CONTAINS],
                    },
                },
            },
        },
        selectableFields: [
            'id',
            'email',
            'firstName',
            'lastName',
            'isActive',
            'emailVerified',
            'createdAt',
            'roles',
            'permissions',
        ],
        sortableFields: ['email', 'firstName', 'lastName', 'createdAt'],
        defaultSort: [{ field: 'createdAt', direction: -1 }],
    };
}
