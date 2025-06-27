import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';

import { forEach, map } from 'lodash';
import { Transaction } from 'sequelize';

import { DateUtils } from '@/common/utils';

import { AssignSinglePermissionDto } from '../dto/assign-permission.dto';
import { AssignRoleDto, AssignSingleRoleDto } from '../dto/assign-role.dto';
import { CreatePermissionDto } from '../dto/create-permission.dto';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { Permission } from '../entities/permission.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { Role } from '../entities/role.entity';
import { UserRole } from '../entities/user-role.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class RbacService {
    constructor(
        @InjectModel(User) private readonly userModel: typeof User,
        @InjectModel(Role) private readonly roleModel: typeof Role,
        @InjectModel(Permission) private readonly permissionModel: typeof Permission,
        @InjectModel(UserRole) private readonly userRoleModel: typeof UserRole,
        @InjectModel(RolePermission) private readonly rolePermissionModel: typeof RolePermission,
    ) {}

    // ========== ROLE MANAGEMENT ==========

    async createRole(createRoleDto: CreateRoleDto, createdBy?: string): Promise<Role> {
        const { permissionIds, ...roleData } = createRoleDto;

        // Check if role name already exists
        const existingRole = await this.roleModel.findOne({ where: { name: roleData.name } });
        if (existingRole) {
            throw new ConflictException(`Role with name '${roleData.name}' already exists`);
        }

        // Create role and optionally assign permissions
        return this.userModel.sequelize.transaction(async (transaction: Transaction) => {
            const role = await this.roleModel.create(roleData, { transaction });

            if (permissionIds?.length) {
                await this.assignPermissionsToRole(role.id, permissionIds, createdBy, transaction);
            }

            return this.getRoleWithPermissions(role.id);
        });
    }

    async updateRole(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
        const role = await this.roleModel.findByPk(id);
        if (!role) {
            throw new NotFoundException(`Role with ID '${id}' not found`);
        }

        if (role.isSystem) {
            throw new BadRequestException('Cannot update system roles');
        }

        await role.update(updateRoleDto);
        return this.getRoleWithPermissions(id);
    }

    async deleteRole(id: string): Promise<void> {
        const role = await this.roleModel.findByPk(id);
        if (!role) {
            throw new NotFoundException(`Role with ID '${id}' not found`);
        }

        if (role.isSystem) {
            throw new BadRequestException('Cannot delete system roles');
        }

        // Check if role is assigned to any users
        const userRoleCount = await this.userRoleModel.count({ where: { roleId: id, isActive: true } });
        if (userRoleCount > 0) {
            throw new BadRequestException('Cannot delete role that is assigned to users');
        }

        await this.userModel.sequelize.transaction(async (transaction: Transaction) => {
            // Delete role permissions
            await this.rolePermissionModel.destroy({ where: { roleId: id }, transaction });
            // Delete role
            await role.destroy({ transaction });
        });
    }

    async getAllRoles(includeInactive = false): Promise<Role[]> {
        const where = includeInactive ? {} : { isActive: true };
        return this.roleModel.findAll({
            where,
            include: [
                {
                    model: Permission,
                    through: {
                        where: { isActive: true },
                        attributes: [],
                    },
                },
            ],
            order: [
                ['priority', 'DESC'],
                ['name', 'ASC'],
            ],
        });
    }

    async getRoleWithPermissions(id: string): Promise<Role> {
        const role = await this.roleModel.findByPk(id, {
            include: [
                {
                    model: Permission,
                    through: {
                        where: { isActive: true },
                        attributes: [],
                    },
                },
                {
                    model: User,
                    through: {
                        where: { isActive: true },
                        attributes: ['assignedAt', 'expiresAt'],
                    },
                },
            ],
        });

        if (!role) {
            throw new NotFoundException(`Role with ID '${id}' not found`);
        }

        return role;
    }

    // ========== PERMISSION MANAGEMENT ==========

    async createPermission(createPermissionDto: CreatePermissionDto): Promise<Permission> {
        // Auto-generate name if not provided or validate format
        const name = createPermissionDto.name || `${createPermissionDto.resource}:${createPermissionDto.action}`;

        const existingPermission = await this.permissionModel.findOne({ where: { name } });
        if (existingPermission) {
            throw new ConflictException(`Permission with name '${name}' already exists`);
        }

        return this.permissionModel.create({
            ...createPermissionDto,
            name,
        });
    }

    async getAllPermissions(includeInactive = false): Promise<Permission[]> {
        const where = includeInactive ? {} : { isActive: true };
        return this.permissionModel.findAll({
            where,
            order: [
                ['resource', 'ASC'],
                ['action', 'ASC'],
            ],
        });
    }

    async getPermissionsByResource(resource: string): Promise<Permission[]> {
        return this.permissionModel.findAll({
            where: { resource, isActive: true },
            order: [['action', 'ASC']],
        });
    }

    async deletePermission(id: string): Promise<void> {
        const permission = await this.permissionModel.findByPk(id);
        if (!permission) {
            throw new NotFoundException(`Permission with ID '${id}' not found`);
        }

        await this.userModel.sequelize.transaction(async (transaction: Transaction) => {
            // Delete role permissions
            await this.rolePermissionModel.destroy({ where: { permissionId: id }, transaction });
            // Delete permission
            await permission.destroy({ transaction });
        });
    }

    // ========== USER ROLE ASSIGNMENT ==========

    async assignRolesToUser(assignRoleDto: AssignRoleDto, assignedBy?: string): Promise<User> {
        const { userId, roleIds, expiresAt } = assignRoleDto;

        // Verify user exists
        const user = await this.userModel.findByPk(userId);
        if (!user) {
            throw new NotFoundException(`User with ID '${userId}' not found`);
        }

        // Verify all roles exist and are active
        const roles = await this.roleModel.findAll({
            where: { id: roleIds, isActive: true },
        });

        if (roles.length !== roleIds.length) {
            throw new BadRequestException('One or more roles not found or inactive');
        }

        return this.userModel.sequelize.transaction(async (transaction: Transaction) => {
            // Remove existing role assignments for these roles
            await this.userRoleModel.destroy({
                where: { userId, roleId: roleIds },
                transaction,
            });

            // Create new assignments
            const userRoleData = map(roleIds, (roleId) => ({
                userId,
                roleId,
                assignedBy,
                expiresAt: expiresAt ? DateUtils.parseToUtc(expiresAt) : null,
            }));

            await this.userRoleModel.bulkCreate(userRoleData, { transaction });

            return this.getUserWithRoles(userId);
        });
    }

    async assignSingleRoleToUser(
        userId: string,
        assignRoleDto: AssignSingleRoleDto,
        assignedBy?: string,
    ): Promise<User> {
        const { roleId, expiresAt } = assignRoleDto;

        // Verify user and role exist
        const [user, role] = await Promise.all([
            this.userModel.findByPk(userId),
            this.roleModel.findOne({ where: { id: roleId, isActive: true } }),
        ]);

        if (!user) {
            throw new NotFoundException(`User with ID '${userId}' not found`);
        }
        if (!role) {
            throw new NotFoundException(`Role with ID '${roleId}' not found or inactive`);
        }

        // Check if assignment already exists and is active
        const existingAssignment = await this.userRoleModel.findOne({
            where: { userId, roleId, isActive: true },
        });

        if (existingAssignment) {
            throw new ConflictException('User already has this role assigned');
        }

        await this.userRoleModel.create({
            userId,
            roleId,
            assignedBy,
            expiresAt: expiresAt ? DateUtils.parseToUtc(expiresAt) : null,
        });

        return this.getUserWithRoles(userId);
    }

    async removeRoleFromUser(userId: string, roleId: string): Promise<User> {
        const assignment = await this.userRoleModel.findOne({
            where: { userId, roleId, isActive: true },
        });

        if (!assignment) {
            throw new NotFoundException('Role assignment not found');
        }

        await assignment.update({ isActive: false });
        return this.getUserWithRoles(userId);
    }

    async getUserWithRoles(userId: string): Promise<User> {
        const user = await this.userModel.findByPk(userId, {
            include: [
                {
                    model: Role,
                    through: {
                        where: { isActive: true },
                        attributes: ['assignedAt', 'expiresAt'],
                    },
                    include: [
                        {
                            model: Permission,
                            through: {
                                where: { isActive: true },
                                attributes: [],
                            },
                        },
                    ],
                },
            ],
        });

        if (!user) {
            throw new NotFoundException(`User with ID '${userId}' not found`);
        }

        return user;
    }

    // ========== ROLE PERMISSION ASSIGNMENT ==========

    async assignPermissionsToRole(
        roleId: string,
        permissionIds: string[],
        grantedBy?: string,
        transaction?: Transaction,
    ): Promise<Role> {
        // Verify role exists
        const role = await this.roleModel.findByPk(roleId);
        if (!role) {
            throw new NotFoundException(`Role with ID '${roleId}' not found`);
        }

        // Verify all permissions exist and are active
        const permissions = await this.permissionModel.findAll({
            where: { id: permissionIds, isActive: true },
        });

        if (permissions.length !== permissionIds.length) {
            throw new BadRequestException('One or more permissions not found or inactive');
        }

        const executeOperation = async (trx: Transaction) => {
            // Remove existing permission assignments for these permissions
            await this.rolePermissionModel.destroy({
                where: { roleId, permissionId: permissionIds },
                transaction: trx,
            });

            // Create new assignments
            const rolePermissionData = map(permissionIds, (permissionId) => ({
                roleId,
                permissionId,
                grantedBy,
            }));

            await this.rolePermissionModel.bulkCreate(rolePermissionData, { transaction: trx });
        };

        if (transaction) {
            await executeOperation(transaction);
        } else {
            await this.userModel.sequelize.transaction(executeOperation);
        }

        return this.getRoleWithPermissions(roleId);
    }

    async assignSinglePermissionToRole(
        roleId: string,
        assignPermissionDto: AssignSinglePermissionDto,
        grantedBy?: string,
    ): Promise<Role> {
        const { permissionId } = assignPermissionDto;

        // Verify role and permission exist
        const [role, permission] = await Promise.all([
            this.roleModel.findByPk(roleId),
            this.permissionModel.findOne({ where: { id: permissionId, isActive: true } }),
        ]);

        if (!role) {
            throw new NotFoundException(`Role with ID '${roleId}' not found`);
        }
        if (!permission) {
            throw new NotFoundException(`Permission with ID '${permissionId}' not found or inactive`);
        }

        // Check if assignment already exists and is active
        const existingAssignment = await this.rolePermissionModel.findOne({
            where: { roleId, permissionId, isActive: true },
        });

        if (existingAssignment) {
            throw new ConflictException('Role already has this permission assigned');
        }

        await this.rolePermissionModel.create({
            roleId,
            permissionId,
            grantedBy,
        });

        return this.getRoleWithPermissions(roleId);
    }

    async removePermissionFromRole(roleId: string, permissionId: string): Promise<Role> {
        const assignment = await this.rolePermissionModel.findOne({
            where: { roleId, permissionId, isActive: true },
        });

        if (!assignment) {
            throw new NotFoundException('Permission assignment not found');
        }

        await assignment.update({ isActive: false });
        return this.getRoleWithPermissions(roleId);
    }

    // ========== PERMISSION CHECKING ==========

    async userHasPermission(userId: string, permissionName: string): Promise<boolean> {
        const userRoles = await this.userRoleModel.findAll({
            where: { userId, isActive: true },
            include: [
                {
                    model: Role,
                    where: { isActive: true },
                    include: [
                        {
                            model: Permission,
                            where: { name: permissionName, isActive: true },
                            through: {
                                where: { isActive: true },
                                attributes: [],
                            },
                        },
                    ],
                },
            ],
        });

        return userRoles.length > 0;
    }

    async userHasAnyPermission(userId: string, permissionNames: string[]): Promise<boolean> {
        for (const permissionName of permissionNames) {
            if (await this.userHasPermission(userId, permissionName)) {
                return true;
            }
        }
        return false;
    }

    async userHasAllPermissions(userId: string, permissionNames: string[]): Promise<boolean> {
        for (const permissionName of permissionNames) {
            if (!(await this.userHasPermission(userId, permissionName))) {
                return false;
            }
        }
        return true;
    }

    async getUserPermissions(userId: string): Promise<string[]> {
        const userRoles = await this.userRoleModel.findAll({
            where: { userId, isActive: true },
            include: [
                {
                    model: Role,
                    where: { isActive: true },
                    include: [
                        {
                            model: Permission,
                            where: { isActive: true },
                            through: {
                                where: { isActive: true },
                                attributes: [],
                            },
                        },
                    ],
                },
            ],
        });

        const permissions = new Set<string>();
        forEach(userRoles, (userRole) => {
            forEach(userRole.Role?.permissions || [], (permission) => {
                permissions.add(permission.name);
            });
        });

        return Array.from(permissions);
    }

    // ========== BULK OPERATIONS ==========

    async bulkCreatePermissions(permissions: CreatePermissionDto[]): Promise<Permission[]> {
        return this.userModel.sequelize.transaction(async () => {
            const createdPermissions: Permission[] = [];

            for (const permissionDto of permissions) {
                try {
                    const permission = await this.createPermission(permissionDto);
                    createdPermissions.push(permission);
                } catch (error) {
                    // Skip duplicates, log others
                    if (!(error instanceof ConflictException)) {
                        throw error;
                    }
                }
            }

            return createdPermissions;
        });
    }

    async initializeDefaultRoles(): Promise<void> {
        const defaultRoles = [
            {
                name: 'super_admin',
                displayName: 'Super Administrator',
                description: 'Full system access',
                priority: 1000,
                isSystem: true,
            },
            {
                name: 'admin',
                displayName: 'Administrator',
                description: 'Administrative access',
                priority: 900,
                isSystem: true,
            },
            {
                name: 'user',
                displayName: 'User',
                description: 'Basic user access',
                priority: 100,
                isSystem: true,
            },
        ];

        for (const roleData of defaultRoles) {
            const existingRole = await this.roleModel.findOne({ where: { name: roleData.name } });
            if (!existingRole) {
                await this.roleModel.create(roleData);
            }
        }
    }
}
