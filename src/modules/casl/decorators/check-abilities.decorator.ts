import { SetMetadata } from '@nestjs/common';

import { map } from 'lodash';

import { Action, Subject, Subjects } from '../types/casl.types';

export const CHECK_ABILITY_KEY = 'check_ability';

export interface RequiredRule {
    action: Action;
    subject: Subject;
    conditions?: Record<string, unknown>;
    inverted?: boolean;
}

/**
 * Decorator to check if user has specific ability
 * @param {RequiredRule[]} requirements - The rules to check
 * @returns {Function} - Decorator function
 */
export const CheckAbilities = (...requirements: RequiredRule[]) => SetMetadata(CHECK_ABILITY_KEY, requirements);

/**
 * Helper functions for common abilities
 */
export const Can = {
    // Basic CRUD operations
    create: (subject: Subject, conditions?: Record<string, unknown>) =>
        CheckAbilities({ action: 'create', subject, conditions }),

    read: (subject: Subject, conditions?: Record<string, unknown>) =>
        CheckAbilities({ action: 'read', subject, conditions }),

    update: (subject: Subject, conditions?: Record<string, unknown>) =>
        CheckAbilities({ action: 'update', subject, conditions }),

    delete: (subject: Subject, conditions?: Record<string, unknown>) =>
        CheckAbilities({ action: 'delete', subject, conditions }),

    manage: (subject: Subject, conditions?: Record<string, unknown>) =>
        CheckAbilities({ action: 'manage', subject, conditions }),

    // Admin operations
    admin: (subject: Subject, conditions?: Record<string, unknown>) =>
        CheckAbilities({ action: 'admin', subject, conditions }),

    // Multiple abilities (all must pass)
    all: (...rules: RequiredRule[]) => CheckAbilities(...rules),

    // At least one ability must pass
    any: (...rules: RequiredRule[]) =>
        CheckAbilities(...map(rules, (rule) => ({ ...rule, mode: 'any' }) as RequiredRule)),

    // Inverted check (user must NOT have ability)
    not: (action: Action, subject: Subject, conditions?: Record<string, unknown>) =>
        CheckAbilities({ action, subject, conditions, inverted: true }),
};

/**
 * Predefined common ability checks
 */
export const CommonAbilities = {
    // User management
    ManageUsers: Can.manage(Subjects.User),
    ReadUsers: Can.read(Subjects.User),
    CreateUsers: Can.create(Subjects.User),
    UpdateUsers: Can.update(Subjects.User),
    DeleteUsers: Can.delete(Subjects.User),

    // Self management (conditions will be added in guard)
    ReadOwnProfile: Can.read(Subjects.User), // conditions: { id: currentUser.id }
    UpdateOwnProfile: Can.update(Subjects.User), // conditions: { id: currentUser.id }

    // Role management
    ManageRoles: Can.manage(Subjects.Role),
    ReadRoles: Can.read(Subjects.Role),
    CreateRoles: Can.create(Subjects.Role),
    UpdateRoles: Can.update(Subjects.Role),
    DeleteRoles: Can.delete(Subjects.Role),

    // Permission management
    ManagePermissions: Can.manage(Subjects.Permission),
    ReadPermissions: Can.read(Subjects.Permission),
    CreatePermissions: Can.create(Subjects.Permission),
    UpdatePermissions: Can.update(Subjects.Permission),
    DeletePermissions: Can.delete(Subjects.Permission),

    // 🔥 NEW: Role/Permission assignment abilities
    AssignRoles: Can.all({ action: 'manage', subject: Subjects.User }, { action: 'manage', subject: Subjects.Role }),
    RemoveRoles: Can.all({ action: 'manage', subject: Subjects.User }, { action: 'manage', subject: Subjects.Role }),
    AssignPermissions: Can.all(
        { action: 'manage', subject: Subjects.Role },
        { action: 'manage', subject: Subjects.Permission },
    ),
    RemovePermissions: Can.all(
        { action: 'manage', subject: Subjects.Role },
        { action: 'manage', subject: Subjects.Permission },
    ),

    // System administration
    AdminSystem: Can.admin(Subjects.System),
    ManageSystem: Can.manage(Subjects.System),
    SystemAdmin: Can.admin(Subjects.System),

    // Everything (super admin)
    ManageAll: Can.manage(Subjects.all),
};
