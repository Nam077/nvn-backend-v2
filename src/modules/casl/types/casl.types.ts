import { Permission } from '@/modules/users/entities/permission.entity';
import { Role } from '@/modules/users/entities/role.entity';
import { User } from '@/modules/users/entities/user.entity';
import { MongoAbility, InferSubjects } from '@casl/ability';

// Define all possible actions
export type Action =
    | 'create'
    | 'read'
    | 'update'
    | 'delete'
    | 'manage' // all actions
    | 'publish'
    | 'admin';

// 🚀 NEW: Use actual entity classes instead of strings
export type Subject = InferSubjects<typeof User | typeof Role | typeof Permission> | 'System' | 'Auth' | 'all'; // all subjects

export const Subjects = {
    // 🔥 Use actual entity classes
    User,
    Role,
    Permission,
    // Keep strings for system subjects
    System: 'System',
    Auth: 'Auth',
    all: 'all',
} as const;

// Main ability type
export type AppAbility = MongoAbility<[Action, Subject]>;

// Enhanced Actions enum
export const Actions = {
    create: 'create',
    read: 'read',
    update: 'update',
    delete: 'delete',
    manage: 'manage',
    publish: 'publish',
    admin: 'admin',
} as const;

// 🎯 Enhanced: Type-safe conditions for common entities
export type UserConditions = {
    id?: string;
    email?: string;
    isActive?: boolean;
    roles?: string[];
};

export type RoleConditions = {
    id?: string;
    name?: string;
    isActive?: boolean;
};

export type PermissionConditions = {
    id?: string;
    name?: string;
    resource?: string;
    action?: string;
    isActive?: boolean;
};

// Generic conditions type
export type EntityConditions = UserConditions | RoleConditions | PermissionConditions | Record<string, unknown>;

// Utility types for easier usage
export interface UserWithRoles {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    isActive: boolean;
    roles?: Role[];
    permissions?: string[];
}
