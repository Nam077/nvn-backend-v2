# RBAC (Role-Based Access Control) System Guide

## Tổng quan

Hệ thống RBAC này được thiết kế với mô hình many-to-many giữa User-Role và Role-Permission, cung cấp quyền kiểm soát truy cập linh hoạt và mở rộng.

## Kiến trúc

### Entities

1. **User** - Người dùng hệ thống
2. **Role** - Vai trò (ví dụ: admin, user, moderator)
3. **Permission** - Quyền hạn cụ thể (ví dụ: users:read, users:write)
4. **UserRole** - Bảng junction User ↔ Role (many-to-many)
5. **RolePermission** - Bảng junction Role ↔ Permission (many-to-many)

### Mô hình quan hệ

```
User ↔ UserRole ↔ Role ↔ RolePermission ↔ Permission
```

## Cách sử dụng

### 1. Decorators cho Controllers

#### Permission-based Authorization (Khuyến nghị)

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '@/modules/auth/guards/permission.guard';
import { RequirePermissions, CommonPermissions, Permission } from '@/modules/auth/decorators/permissions.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    // Yêu cầu permission cụ thể
    @Get()
    @UseGuards(PermissionGuard)
    @RequirePermissions(CommonPermissions.USERS_READ)
    findAll() {
        // User cần có permission 'users:read'
    }

    // Yêu cầu ANY của các permissions (OR logic)
    @Get('admin')
    @UseGuards(PermissionGuard)
    @Permission.any(CommonPermissions.USERS_ADMIN, CommonPermissions.SYSTEM_ADMIN)
    adminPanel() {
        // User cần có ít nhất một trong các permissions: 'users:admin' HOẶC 'system:admin'
    }

    // Yêu cầu ALL permissions (AND logic)
    @Delete(':id')
    @UseGuards(PermissionGuard)
    @Permission.all(CommonPermissions.USERS_DELETE, CommonPermissions.USERS_ADMIN)
    deleteUser() {
        // User cần có cả hai permissions: 'users:delete' VÀ 'users:admin'
    }
}
```

#### Role-based Authorization (Fallback)

```typescript
import { RequireRoles, CommonRoles } from '@/modules/auth/decorators/roles.decorator';
import { RoleGuard } from '@/modules/auth/guards/role.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
    @Get()
    @UseGuards(RoleGuard)
    @RequireRoles(CommonRoles.ADMIN, CommonRoles.SUPER_ADMIN)
    adminOnly() {
        // Chỉ user có role 'admin' hoặc 'super_admin'
    }
}
```

### 2. API Endpoints

#### Quản lý Roles

```bash
# Tạo role mới
POST /rbac/roles
{
  "name": "content_manager",
  "displayName": "Content Manager",
  "description": "Can manage content",
  "permissionIds": ["permission-uuid-1", "permission-uuid-2"]
}

# Lấy tất cả roles
GET /rbac/roles

# Lấy role cùng permissions
GET /rbac/roles/:roleId

# Cập nhật role
PUT /rbac/roles/:roleId

# Xóa role
DELETE /rbac/roles/:roleId
```

#### Quản lý Permissions

```bash
# Tạo permission mới
POST /rbac/permissions
{
  "name": "posts:write",
  "description": "Can create and edit posts",
  "resource": "posts",
  "action": "write"
}

# Lấy tất cả permissions
GET /rbac/permissions

# Lấy permissions theo resource
GET /rbac/permissions?resource=users

# Xóa permission
DELETE /rbac/permissions/:permissionId
```

#### Gán Roles cho Users

```bash
# Gán nhiều roles cho user
POST /rbac/users/roles
{
  "userId": "user-uuid",
  "roleIds": ["role-uuid-1", "role-uuid-2"],
  "expiresAt": "2024-12-31T23:59:59.999Z" // Optional
}

# Gán một role cho user
POST /rbac/users/:userId/roles
{
  "roleId": "role-uuid",
  "expiresAt": "2024-12-31T23:59:59.999Z" // Optional
}

# Xóa role khỏi user
DELETE /rbac/users/:userId/roles/:roleId

# Lấy user với roles và permissions
GET /rbac/users/:userId
```

#### Gán Permissions cho Roles

```bash
# Gán nhiều permissions cho role (thay thế tất cả)
PUT /rbac/roles/:roleId/permissions
{
  "permissionIds": ["permission-uuid-1", "permission-uuid-2"]
}

# Gán một permission cho role
POST /rbac/roles/:roleId/permissions
{
  "permissionId": "permission-uuid"
}

# Xóa permission khỏi role
DELETE /rbac/roles/:roleId/permissions/:permissionId
```

#### Kiểm tra Permissions

```bash
# Lấy tất cả permissions của user
GET /rbac/users/:userId/permissions

# Kiểm tra user có permission cụ thể không
GET /rbac/users/:userId/permissions/:permissionName/check
# Response: { "hasPermission": true|false }
```

### 3. Programmatic Usage

```typescript
import { RbacService } from '@/modules/users/services/rbac.service';

@Injectable()
export class SomeService {
    constructor(private rbacService: RbacService) {}

    async checkUserPermission(userId: string) {
        // Kiểm tra user có permission cụ thể
        const hasPermission = await this.rbacService.userHasPermission(userId, 'users:read');

        // Kiểm tra user có ít nhất một trong các permissions
        const hasAnyPermission = await this.rbacService.userHasAnyPermission(userId, ['users:admin', 'system:admin']);

        // Kiểm tra user có tất cả permissions
        const hasAllPermissions = await this.rbacService.userHasAllPermissions(userId, ['users:read', 'users:write']);

        // Lấy tất cả permissions của user
        const userPermissions = await this.rbacService.getUserPermissions(userId);
    }
}
```

### 4. Permissions có sẵn

```typescript
// User management
CommonPermissions.USERS_READ = 'users:read';
CommonPermissions.USERS_WRITE = 'users:write';
CommonPermissions.USERS_DELETE = 'users:delete';
CommonPermissions.USERS_ADMIN = 'users:admin';

// Role management
CommonPermissions.ROLES_READ = 'roles:read';
CommonPermissions.ROLES_WRITE = 'roles:write';
CommonPermissions.ROLES_DELETE = 'roles:delete';
CommonPermissions.ROLES_ADMIN = 'roles:admin';

// Permission management
CommonPermissions.PERMISSIONS_READ = 'permissions:read';
CommonPermissions.PERMISSIONS_WRITE = 'permissions:write';
CommonPermissions.PERMISSIONS_DELETE = 'permissions:delete';
CommonPermissions.PERMISSIONS_ADMIN = 'permissions:admin';

// System
CommonPermissions.SYSTEM_CONFIG = 'system:config';
CommonPermissions.SYSTEM_ADMIN = 'system:admin';
CommonPermissions.AUTH_MANAGE = 'auth:manage';
CommonPermissions.SECURITY_ADMIN = 'security:admin';
```

### 5. Roles mặc định

```typescript
CommonRoles.SUPER_ADMIN = 'super_admin'; // Có tất cả permissions
CommonRoles.ADMIN = 'admin'; // Có permissions quản lý users cơ bản
CommonRoles.USER = 'user'; // Chỉ có permissions đọc cơ bản
```

## Best Practices

### 1. Sử dụng Permission-based thay vì Role-based

```typescript
// ✅ Good - Dựa trên permission cụ thể
@RequirePermissions(CommonPermissions.USERS_DELETE)

// ❌ Avoid - Dựa trên role, ít linh hoạt
@RequireRoles(CommonRoles.ADMIN)
```

### 2. Naming Convention cho Permissions

```
Format: resource:action
Examples:
- users:read
- users:write
- users:delete
- posts:create
- posts:publish
- orders:cancel
```

### 3. Tổ chức Permissions theo Resource

```typescript
// Nhóm permissions theo tài nguyên
const UserPermissions = {
    READ: 'users:read',
    WRITE: 'users:write',
    DELETE: 'users:delete',
    ADMIN: 'users:admin',
} as const;

const PostPermissions = {
    CREATE: 'posts:create',
    READ: 'posts:read',
    UPDATE: 'posts:update',
    DELETE: 'posts:delete',
    PUBLISH: 'posts:publish',
} as const;
```

### 4. Sử dụng Guard kết hợp

```typescript
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermissions(CommonPermissions.USERS_ADMIN)
```

## Troubleshooting

### Lỗi thường gặp

1. **403 Forbidden**: User không có permission yêu cầu
2. **User not authenticated**: Thiếu JWT token hoặc token không hợp lệ
3. **Permission check failed**: Lỗi database hoặc user không tồn tại

### Debug

```typescript
// Kiểm tra permissions của user
const permissions = await rbacService.getUserPermissions(userId);
console.log('User permissions:', permissions);

// Kiểm tra roles của user
const user = await rbacService.getUserWithRoles(userId);
console.log(
    'User roles:',
    user.roles.map((r) => r.name),
);
```

## Migration và Seeding

Hệ thống tự động tạo:

- Default roles: super_admin, admin, user
- Default permissions: tất cả CommonPermissions
- Permission assignments cho default roles

Để tùy chỉnh, chỉnh sửa `RbacSeederService`.
