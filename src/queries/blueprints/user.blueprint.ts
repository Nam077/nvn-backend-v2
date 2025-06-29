import {
    BOOLEAN_OPERATORS,
    DATE_OPERATORS,
    JSON_OPERATORS,
    STRING_OPERATORS,
} from '@/common/query-builder/operators.constants';
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
                operators: [BOOLEAN_OPERATORS.EQUALS, BOOLEAN_OPERATORS.IN],
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
                operators: [BOOLEAN_OPERATORS.EQUALS, BOOLEAN_OPERATORS.IN],
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
                    name: {
                        operators: [JSON_OPERATORS.JSON_EQUALS, JSON_OPERATORS.JSON_IN],
                    },
                },
            },
            permissions: {
                model: Permission,
                fields: {
                    name: {
                        operators: [JSON_OPERATORS.JSON_EQUALS, JSON_OPERATORS.JSON_IN],
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
        defaultSort: [['createdAt', 'DESC']],
    };
}
