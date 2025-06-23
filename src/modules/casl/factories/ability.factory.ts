/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Injectable } from '@nestjs/common';

import { forEach, get, includes, isEmpty, map, split, toLower } from 'lodash';

import { CachedUserData } from '@/common/interfaces';
import { AbilityBuilder, createMongoAbility } from '@casl/ability';

import { AppAbility, Actions, Subjects, UserWithRoles, Action, Subject } from '../types/casl.types';

@Injectable()
export class AbilityFactory {
    createForUser(user: CachedUserData): AppAbility {
        const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

        if (isEmpty(get(user, 'roles', []))) {
            // No roles = basic read access only to own profile
            can(Actions.read, Subjects.User, { id: user.id });
            return build();
        }

        // 🎯 NEW: Get all permissions from user's roles
        const userPermissions: string[] = get(user, 'permissions', []) as string[];

        // 🚀 Convert permissions to CASL abilities
        forEach(userPermissions, (permission) => {
            const [resource, action] = split(permission, ':');
            if (action && resource) {
                this.mapPermissionToAbility(can, action, resource);
            }
        });

        // 🚫 Universal restrictions (regardless of permissions)
        cannot(Actions.delete, Subjects.User, { id: user.id }); // Cannot delete own account

        return build();
    }

    // 🎯 NEW: Map permission string to CASL ability
    private mapPermissionToAbility(can: (action: any, subject: any) => void, action: string, resource: string): void {
        let caslSubject: any;

        // Map resource to CASL subject - use class constructors for explicitness
        switch (resource) {
            case 'users':
                caslSubject = Subjects.User; // Class constructor
                break;
            case 'roles':
                caslSubject = Subjects.Role; // Class constructor
                break;
            case 'permissions':
                caslSubject = Subjects.Permission; // Class constructor
                break;
            case 'system':
                caslSubject = Subjects.System;
                break;
            case 'auth':
                caslSubject = Subjects.Auth;
                break;
            default:
                return; // Skip unknown resources
        }

        // Map action to CASL permission with conditions
        switch (action) {
            case 'read':
                if (resource === 'users') {
                    // Users can read own profile by default, admins can read all
                    can(Actions.read, caslSubject); // Admin level
                } else {
                    can(Actions.read, caslSubject);
                }
                break;

            case 'create':
                can(Actions.create, caslSubject);
                break;

            case 'update':
                if (resource === 'users') {
                    // Users can update own profile, admins can update all
                    can(Actions.update, caslSubject); // Admin level
                } else {
                    can(Actions.update, caslSubject);
                }
                break;

            case 'delete':
                can(Actions.delete, caslSubject);
                break;

            case 'admin':
                can(Actions.admin, caslSubject);
                can(Actions.manage, caslSubject); // Admin includes manage
                break;

            case 'manage':
                can(Actions.manage, caslSubject);
                break;

            case 'write':
                // Write = create + update
                can(Actions.create, caslSubject);
                can(Actions.update, caslSubject);
                break;

            default:
                // For any custom actions, map directly
                can(action as any, caslSubject);
                break;
        }
    }

    // 🎯 UPDATED: Role-based method for backward compatibility (deprecated)
    createForUserLegacy(user: UserWithRoles): AppAbility {
        const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

        if (isEmpty(get(user, 'roles', []))) {
            // No roles = basic read access only
            can(Actions.read, Subjects.User, { id: user.id }); // Can only read own profile
            return build();
        }

        // Check for specific roles
        const roleNames = map(get(user, 'roles', []), (role) => toLower(get(role, 'name', '')));

        // Super Admin - can do everything
        if (includes(roleNames, 'super_admin')) {
            can(Actions.manage, Subjects.all);
            return build();
        }

        // Admin - can manage users and roles
        if (includes(roleNames, 'admin')) {
            can(Actions.manage, Subjects.User);
            can(Actions.read, Subjects.Role);
            can(Actions.read, Subjects.Permission);
            can(Actions.admin, Subjects.System);
        }

        // Regular User - basic permissions
        if (includes(roleNames, 'user')) {
            can(Actions.read, Subjects.User, { id: user.id }); // Own profile only
            can(Actions.update, Subjects.User, { id: user.id }); // Own profile only
        }

        // Support - can read and help users
        if (includes(roleNames, 'support')) {
            can(Actions.read, Subjects.User);
            can(Actions.update, Subjects.User, { isActive: true }); // Only active users
        }

        // cannot delete own account
        cannot(Actions.delete, Subjects.User, { id: user.id });

        return build();
    }

    // Helper method to create ability for specific permissions
    createWithPermissions(permissions: string[]): AppAbility {
        const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

        forEach(permissions, (permission) => {
            const [action, subject] = split(permission, ':');
            if (action && subject) {
                can(action as any, subject as any);
            }
        });

        return build();
    }

    // Helper method for checking if user can perform action
    canUserPerform(user: CachedUserData, action: string, subject: string): boolean {
        const ability = this.createForUser(user);
        return ability.can(action as any, subject as any);
    }

    // Helper method for checking with conditions
    canUserPerformWithConditions(user: CachedUserData, action: string, subject: string, conditions?: any): boolean {
        const ability = this.createForUser(user);
        return ability.can(action as any, subject as any, conditions);
    }

    // 🎯 NEW: Type-safe ability checkers
    canWithConditions(
        ability: AppAbility,
        action: Action,
        subject: Subject,
        conditions: Record<string, unknown>,
    ): boolean {
        return ability.can(action, subject, conditions as any);
    }

    canRead(ability: AppAbility, subject: Subject, conditions?: Record<string, unknown>): boolean {
        return conditions ? this.canWithConditions(ability, 'read', subject, conditions) : ability.can('read', subject);
    }

    canUpdate(ability: AppAbility, subject: Subject, conditions?: Record<string, unknown>): boolean {
        return conditions
            ? this.canWithConditions(ability, 'update', subject, conditions)
            : ability.can('update', subject);
    }

    canDelete(ability: AppAbility, subject: Subject, conditions?: Record<string, unknown>): boolean {
        return conditions
            ? this.canWithConditions(ability, 'delete', subject, conditions)
            : ability.can('delete', subject);
    }

    canManage(ability: AppAbility, subject: Subject, conditions?: Record<string, unknown>): boolean {
        return conditions
            ? this.canWithConditions(ability, 'manage', subject, conditions)
            : ability.can('manage', subject);
    }
}
