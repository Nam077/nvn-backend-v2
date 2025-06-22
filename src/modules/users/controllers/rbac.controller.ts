import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';

import { GetUser } from '@/modules/auth/decorators/get-user.decorator';
import { CommonAbilities } from '@/modules/casl/decorators/check-abilities.decorator';
import { CaslGuard } from '@/modules/casl/guards/casl.guard';

import { AssignPermissionDto, AssignSinglePermissionDto } from '../dto/assign-permission.dto';
import { AssignRoleDto, AssignSingleRoleDto } from '../dto/assign-role.dto';
import { CreatePermissionDto } from '../dto/create-permission.dto';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { Permission as PermissionEntity } from '../entities/permission.entity';
import { Role } from '../entities/role.entity';
import { User } from '../entities/user.entity';
import { RbacService } from '../services/rbac.service';

interface AuthUser {
    id: string;
    email: string;
    role?: string;
}

@ApiTags('RBAC Management')
@ApiBearerAuth()
@Controller('rbac')
@UseGuards(AuthGuard, CaslGuard)
export class RbacController {
    constructor(private readonly rbacService: RbacService) {}

    // ========== ROLE MANAGEMENT ==========

    @Post('roles')
    @CommonAbilities.CreateRoles
    @ApiOperation({ summary: 'Create a new role with permissions' })
    @ApiResponse({ status: 201, description: 'Role created successfully', type: Role })
    @ApiResponse({ status: 409, description: 'Role name already exists' })
    async createRole(@Body() createRoleDto: CreateRoleDto, @GetUser() user: AuthUser): Promise<Role> {
        return this.rbacService.createRole(createRoleDto, user.id);
    }

    @Get('roles')
    @CommonAbilities.ReadRoles
    @ApiOperation({ summary: 'Get all roles' })
    @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
    @ApiResponse({ status: 200, description: 'Roles retrieved successfully', type: [Role] })
    async getAllRoles(@Query('includeInactive') includeInactive?: boolean): Promise<Role[]> {
        return this.rbacService.getAllRoles(includeInactive);
    }

    @Get('roles/:id')
    @CommonAbilities.ReadRoles
    @ApiOperation({ summary: 'Get role by ID with permissions' })
    @ApiParam({ name: 'id', description: 'Role ID' })
    @ApiResponse({ status: 200, description: 'Role retrieved successfully', type: Role })
    @ApiResponse({ status: 404, description: 'Role not found' })
    async getRoleWithPermissions(@Param('id', ParseUUIDPipe) id: string): Promise<Role> {
        return this.rbacService.getRoleWithPermissions(id);
    }

    @Put('roles/:id')
    @CommonAbilities.UpdateRoles
    @ApiOperation({ summary: 'Update role' })
    @ApiParam({ name: 'id', description: 'Role ID' })
    @ApiResponse({ status: 200, description: 'Role updated successfully', type: Role })
    @ApiResponse({ status: 404, description: 'Role not found' })
    @ApiResponse({ status: 400, description: 'Cannot update system roles' })
    async updateRole(@Param('id', ParseUUIDPipe) id: string, @Body() updateRoleDto: UpdateRoleDto): Promise<Role> {
        return this.rbacService.updateRole(id, updateRoleDto);
    }

    @Delete('roles/:id')
    @CommonAbilities.DeleteRoles
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete role' })
    @ApiParam({ name: 'id', description: 'Role ID' })
    @ApiResponse({ status: 204, description: 'Role deleted successfully' })
    @ApiResponse({ status: 404, description: 'Role not found' })
    @ApiResponse({ status: 400, description: 'Cannot delete system roles or roles assigned to users' })
    async deleteRole(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.rbacService.deleteRole(id);
    }

    // ========== PERMISSION MANAGEMENT ==========

    @Post('permissions')
    @CommonAbilities.CreatePermissions
    @ApiOperation({ summary: 'Create a new permission' })
    @ApiResponse({ status: 201, description: 'Permission created successfully', type: PermissionEntity })
    @ApiResponse({ status: 409, description: 'Permission name already exists' })
    async createPermission(@Body() createPermissionDto: CreatePermissionDto): Promise<PermissionEntity> {
        return this.rbacService.createPermission(createPermissionDto);
    }

    @Get('permissions')
    @CommonAbilities.ReadPermissions
    @ApiOperation({ summary: 'Get all permissions' })
    @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
    @ApiQuery({ name: 'resource', required: false, type: String, description: 'Filter by resource' })
    @ApiResponse({ status: 200, description: 'Permissions retrieved successfully', type: [PermissionEntity] })
    async getAllPermissions(
        @Query('includeInactive') includeInactive?: boolean,
        @Query('resource') resource?: string,
    ): Promise<PermissionEntity[]> {
        if (resource) {
            return this.rbacService.getPermissionsByResource(resource);
        }
        return this.rbacService.getAllPermissions(includeInactive);
    }

    @Delete('permissions/:id')
    @CommonAbilities.DeletePermissions
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete permission' })
    @ApiParam({ name: 'id', description: 'Permission ID' })
    @ApiResponse({ status: 204, description: 'Permission deleted successfully' })
    @ApiResponse({ status: 404, description: 'Permission not found' })
    async deletePermission(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
        return this.rbacService.deletePermission(id);
    }

    // ========== USER ROLE ASSIGNMENT ==========

    @Post('users/roles')
    @CommonAbilities.AssignRoles
    @ApiOperation({ summary: 'Assign roles to user' })
    @ApiResponse({ status: 200, description: 'Roles assigned successfully', type: User })
    @ApiResponse({ status: 404, description: 'User or role not found' })
    async assignRolesToUser(@Body() assignRoleDto: AssignRoleDto, @GetUser() user: AuthUser): Promise<User> {
        return this.rbacService.assignRolesToUser(assignRoleDto, user.id);
    }

    @Post('users/:userId/roles')
    @CommonAbilities.AssignRoles
    @ApiOperation({ summary: 'Assign single role to user' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiResponse({ status: 200, description: 'Role assigned successfully', type: User })
    async assignSingleRoleToUser(
        @Param('userId', ParseUUIDPipe) userId: string,
        @Body() assignRoleDto: AssignSingleRoleDto,
        @GetUser() user: AuthUser,
    ): Promise<User> {
        return this.rbacService.assignSingleRoleToUser(userId, assignRoleDto, user.id);
    }

    @Delete('users/:userId/roles/:roleId')
    @CommonAbilities.RemoveRoles
    @ApiOperation({ summary: 'Remove role from user' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiParam({ name: 'roleId', description: 'Role ID' })
    @ApiResponse({ status: 200, description: 'Role removed successfully', type: User })
    async removeRoleFromUser(
        @Param('userId', ParseUUIDPipe) userId: string,
        @Param('roleId', ParseUUIDPipe) roleId: string,
    ): Promise<User> {
        return this.rbacService.removeRoleFromUser(userId, roleId);
    }

    @Get('users/:userId')
    @CommonAbilities.ReadUsers
    @ApiOperation({ summary: 'Get user with roles and permissions' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiResponse({ status: 200, description: 'User retrieved successfully', type: User })
    async getUserWithRoles(@Param('userId', ParseUUIDPipe) userId: string): Promise<User> {
        return this.rbacService.getUserWithRoles(userId);
    }

    // ========== ROLE PERMISSION ASSIGNMENT ==========

    @Post('roles/:roleId/permissions')
    @CommonAbilities.AssignPermissions
    @ApiOperation({ summary: 'Assign single permission to role' })
    @ApiParam({ name: 'roleId', description: 'Role ID' })
    @ApiResponse({ status: 200, description: 'Permission assigned successfully', type: Role })
    async assignSinglePermissionToRole(
        @Param('roleId', ParseUUIDPipe) roleId: string,
        @Body() assignPermissionDto: AssignSinglePermissionDto,
        @GetUser() user: AuthUser,
    ): Promise<Role> {
        return this.rbacService.assignSinglePermissionToRole(roleId, assignPermissionDto, user.id);
    }

    @Put('roles/:roleId/permissions')
    @CommonAbilities.AssignPermissions
    @ApiOperation({ summary: 'Assign multiple permissions to role (replaces existing)' })
    @ApiParam({ name: 'roleId', description: 'Role ID' })
    @ApiResponse({ status: 200, description: 'Permissions assigned successfully', type: Role })
    async assignPermissionsToRole(
        @Param('roleId', ParseUUIDPipe) roleId: string,
        @Body() assignPermissionDto: AssignPermissionDto,
        @GetUser() user: AuthUser,
    ): Promise<Role> {
        return this.rbacService.assignPermissionsToRole(roleId, assignPermissionDto.permissionIds, user.id);
    }

    @Delete('roles/:roleId/permissions/:permissionId')
    @CommonAbilities.RemovePermissions
    @ApiOperation({ summary: 'Remove permission from role' })
    @ApiParam({ name: 'roleId', description: 'Role ID' })
    @ApiParam({ name: 'permissionId', description: 'Permission ID' })
    @ApiResponse({ status: 200, description: 'Permission removed successfully', type: Role })
    async removePermissionFromRole(
        @Param('roleId', ParseUUIDPipe) roleId: string,
        @Param('permissionId', ParseUUIDPipe) permissionId: string,
    ): Promise<Role> {
        return this.rbacService.removePermissionFromRole(roleId, permissionId);
    }

    // ========== PERMISSION CHECKING ==========

    @Get('users/:userId/permissions')
    @CommonAbilities.ReadUsers
    @ApiOperation({ summary: 'Get all permissions for a user' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiResponse({ status: 200, description: 'User permissions retrieved successfully', type: [String] })
    async getUserPermissions(@Param('userId', ParseUUIDPipe) userId: string): Promise<string[]> {
        return this.rbacService.getUserPermissions(userId);
    }

    @Get('users/:userId/permissions/:permission/check')
    @CommonAbilities.ReadUsers
    @ApiOperation({ summary: 'Check if user has specific permission' })
    @ApiParam({ name: 'userId', description: 'User ID' })
    @ApiParam({ name: 'permission', description: 'Permission name' })
    @ApiResponse({
        status: 200,
        description: 'Permission check result',
        schema: { type: 'object', properties: { hasPermission: { type: 'boolean' } } },
    })
    async checkUserPermission(
        @Param('userId', ParseUUIDPipe) userId: string,
        @Param('permission') permission: string,
    ): Promise<{ hasPermission: boolean }> {
        const hasPermission = await this.rbacService.userHasPermission(userId, permission);
        return { hasPermission };
    }

    // ========== SYSTEM ADMINISTRATION ==========

    @Post('system/initialize')
    @CommonAbilities.SystemAdmin
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Initialize default roles (Super Admin only)' })
    @ApiResponse({ status: 200, description: 'Default roles initialized successfully' })
    @ApiResponse({ status: 403, description: 'Only Super Admin can perform this action' })
    async initializeDefaultRoles(): Promise<{ message: string }> {
        await this.rbacService.initializeDefaultRoles();
        return { message: 'Default roles initialized successfully' };
    }

    @Post('permissions/bulk')
    @CommonAbilities.SystemAdmin
    @ApiOperation({ summary: 'Bulk create permissions' })
    @ApiResponse({ status: 201, description: 'Permissions created successfully', type: [PermissionEntity] })
    async bulkCreatePermissions(@Body() permissions: CreatePermissionDto[]): Promise<PermissionEntity[]> {
        return this.rbacService.bulkCreatePermissions(permissions);
    }
}
