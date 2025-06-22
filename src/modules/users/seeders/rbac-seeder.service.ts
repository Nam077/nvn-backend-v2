import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { filter, includes, map } from 'lodash';

import { CreateUserDto } from '@/modules/users/dto/create-user.dto';
import { UsersService } from '@/modules/users/users.service';

import { CreatePermissionDto } from '../dto/create-permission.dto';
import { RbacService } from '../services/rbac.service';

// 🎯 CASL-compatible permissions (replacing CommonPermissions)
const CaslPermissions = {
    // User management permissions
    USERS_READ: 'users:read',
    USERS_WRITE: 'users:write',
    USERS_DELETE: 'users:delete',
    USERS_ADMIN: 'users:admin',

    // Role management permissions
    ROLES_READ: 'roles:read',
    ROLES_WRITE: 'roles:write',
    ROLES_DELETE: 'roles:delete',
    ROLES_ADMIN: 'roles:admin',

    // Permission management permissions
    PERMISSIONS_READ: 'permissions:read',
    PERMISSIONS_WRITE: 'permissions:write',
    PERMISSIONS_DELETE: 'permissions:delete',
    PERMISSIONS_ADMIN: 'permissions:admin',

    // System administration permissions
    SYSTEM_CONFIG: 'system:config',
    SYSTEM_ADMIN: 'system:admin',

    // Authentication & Security permissions
    AUTH_MANAGE: 'auth:manage',
    SECURITY_ADMIN: 'security:admin',
} as const;

@Injectable()
export class RbacSeederService implements OnModuleInit {
    constructor(
        private readonly rbacService: RbacService,
        private readonly usersService: UsersService,
        private readonly logger: Logger,
    ) {}

    async onModuleInit() {
        // Initialize default roles and permissions when module starts
        await this.initializeDefaultPermissions();
        await this.rbacService.initializeDefaultRoles();
        await this.assignPermissionsToDefaultRoles();
        await this.createSysAdminUser();
    }

    private async initializeDefaultPermissions(): Promise<void> {
        const defaultPermissions: CreatePermissionDto[] = [
            // User management permissions
            {
                name: CaslPermissions.USERS_READ,
                description: 'Can read user information',
                resource: 'users',
                action: 'read',
            },
            {
                name: CaslPermissions.USERS_WRITE,
                description: 'Can create and update users',
                resource: 'users',
                action: 'write',
            },
            {
                name: CaslPermissions.USERS_DELETE,
                description: 'Can delete users',
                resource: 'users',
                action: 'delete',
            },
            {
                name: CaslPermissions.USERS_ADMIN,
                description: 'Full admin access to user management',
                resource: 'users',
                action: 'admin',
            },

            // Role management permissions
            {
                name: CaslPermissions.ROLES_READ,
                description: 'Can read role information',
                resource: 'roles',
                action: 'read',
            },
            {
                name: CaslPermissions.ROLES_WRITE,
                description: 'Can create and update roles',
                resource: 'roles',
                action: 'write',
            },
            {
                name: CaslPermissions.ROLES_DELETE,
                description: 'Can delete roles',
                resource: 'roles',
                action: 'delete',
            },
            {
                name: CaslPermissions.ROLES_ADMIN,
                description: 'Full admin access to role management',
                resource: 'roles',
                action: 'admin',
            },

            // Permission management permissions
            {
                name: CaslPermissions.PERMISSIONS_READ,
                description: 'Can read permission information',
                resource: 'permissions',
                action: 'read',
            },
            {
                name: CaslPermissions.PERMISSIONS_WRITE,
                description: 'Can create and update permissions',
                resource: 'permissions',
                action: 'write',
            },
            {
                name: CaslPermissions.PERMISSIONS_DELETE,
                description: 'Can delete permissions',
                resource: 'permissions',
                action: 'delete',
            },
            {
                name: CaslPermissions.PERMISSIONS_ADMIN,
                description: 'Full admin access to permission management',
                resource: 'permissions',
                action: 'admin',
            },

            // System administration permissions
            {
                name: CaslPermissions.SYSTEM_CONFIG,
                description: 'Can configure system settings',
                resource: 'system',
                action: 'config',
            },
            {
                name: CaslPermissions.SYSTEM_ADMIN,
                description: 'Full system administration access',
                resource: 'system',
                action: 'admin',
            },

            // Authentication & Security permissions
            {
                name: CaslPermissions.AUTH_MANAGE,
                description: 'Can manage authentication settings',
                resource: 'auth',
                action: 'manage',
            },
            {
                name: CaslPermissions.SECURITY_ADMIN,
                description: 'Can manage security settings',
                resource: 'security',
                action: 'admin',
            },

            // 🎯 CASL-specific permissions for fine-grained control
            {
                name: 'users:create',
                description: 'Can create new users',
                resource: 'users',
                action: 'create',
            },
            {
                name: 'users:update',
                description: 'Can update user information',
                resource: 'users',
                action: 'update',
            },
            {
                name: 'users:manage',
                description: 'Can perform all operations on users',
                resource: 'users',
                action: 'manage',
            },
            {
                name: 'roles:create',
                description: 'Can create new roles',
                resource: 'roles',
                action: 'create',
            },
            {
                name: 'roles:update',
                description: 'Can update role information',
                resource: 'roles',
                action: 'update',
            },
            {
                name: 'roles:manage',
                description: 'Can perform all operations on roles',
                resource: 'roles',
                action: 'manage',
            },
            {
                name: 'permissions:create',
                description: 'Can create new permissions',
                resource: 'permissions',
                action: 'create',
            },
            {
                name: 'permissions:update',
                description: 'Can update permission information',
                resource: 'permissions',
                action: 'update',
            },
            {
                name: 'permissions:manage',
                description: 'Can perform all operations on permissions',
                resource: 'permissions',
                action: 'manage',
            },
        ];

        this.logger.log('🌱 Seeding CASL permissions...');
        await this.rbacService.bulkCreatePermissions(defaultPermissions);
        this.logger.log(`✅ Seeded ${defaultPermissions.length} CASL permissions successfully`);
    }

    private async assignPermissionsToDefaultRoles(): Promise<void> {
        try {
            // Get all roles
            const roles = await this.rbacService.getAllRoles(true);
            const permissions = await this.rbacService.getAllPermissions(true);

            // Get role instances
            const superAdminRole = roles.find((r) => r.name === 'super_admin');
            const adminRole = roles.find((r) => r.name === 'admin');
            const userRole = roles.find((r) => r.name === 'user');

            if (!superAdminRole || !adminRole || !userRole) {
                this.logger.warn('⚠️ Default roles not found - skipping permission assignment');
                return;
            }

            this.logger.log('🔗 Assigning permissions to default roles...');

            // 🎯 Super Admin gets all permissions (manage all)
            const allPermissionIds = map(permissions, (p) => p.id);
            await this.rbacService.assignPermissionsToRole(superAdminRole.id, allPermissionIds);
            this.logger.log(`✅ Super Admin: assigned ${allPermissionIds.length} permissions`);

            // 🎯 Admin gets comprehensive user management + read access to roles/permissions
            const adminPermissions = filter(
                permissions,
                (p) =>
                    includes(p.name, 'users:') || // All user permissions
                    p.name === 'roles:read' ||
                    p.name === 'roles:update' ||
                    p.name === 'permissions:read' ||
                    p.name === 'system:config',
            );
            await this.rbacService.assignPermissionsToRole(
                adminRole.id,
                map(adminPermissions, (p) => p.id),
            );
            this.logger.log(`✅ Admin: assigned ${adminPermissions.length} permissions`);

            // 🎯 Regular user gets basic read permissions only
            const userPermissions = filter(permissions, (p) => p.name === 'users:read');
            await this.rbacService.assignPermissionsToRole(
                userRole.id,
                map(userPermissions, (p) => p.id),
            );
            this.logger.log(`✅ User: assigned ${userPermissions.length} permissions`);

            this.logger.log('🎊 CASL permissions assigned to default roles successfully');
        } catch (error) {
            this.logger.error('❌ Error assigning permissions to default roles:', error);
        }
    }

    /**
     * Create system admin user and assign super_admin role
     */
    private async createSysAdminUser(): Promise<void> {
        try {
            const sysAdminEmail = 'sysadmin@nvn.com';
            const sysAdminPassword = 'SysAdmin123!';

            // Check if sysadmin user already exists
            const existingUser = await this.usersService.findByEmail(sysAdminEmail);
            if (existingUser) {
                this.logger.log('🔒 System admin user already exists, skipping creation');
                return;
            }

            this.logger.log('👤 Creating system admin user...');

            // Create sysadmin user
            const sysAdminDto: CreateUserDto = {
                email: sysAdminEmail,
                password: sysAdminPassword,
                firstName: 'System',
                lastName: 'Administrator',
            };

            const sysAdminUser = await this.usersService.create(sysAdminDto);
            this.logger.log(`✅ System admin user created with ID: ${sysAdminUser.id}`);

            // Get super_admin role
            const roles = await this.rbacService.getAllRoles(true);
            const superAdminRole = roles.find((role) => role.name === 'super_admin');

            if (!superAdminRole) {
                this.logger.error('❌ Super admin role not found!');
                return;
            }

            // Assign super_admin role to sysadmin user
            await this.rbacService.assignSingleRoleToUser(
                sysAdminUser.id,
                { roleId: superAdminRole.id },
                sysAdminUser.id, // assignedBy
            );

            this.logger.log('🔐 Super admin role assigned to sysadmin user successfully');
            this.logger.log(`📧 Login with: ${sysAdminEmail} / ${sysAdminPassword}`);
        } catch (error) {
            this.logger.error('❌ Error creating system admin user:', error);
        }
    }
}
