# 🎨 NVN Backend - Font Management System

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

## 📋 Overview

**NVN Backend** là hệ thống quản lý font chữ được xây dựng với NestJS, TypeScript, và PostgreSQL. Hệ thống được thiết kế tối ưu cho **1000 users** với nguyên tắc **KISS (Keep It Simple, Stupid)**, tránh over-engineering và tập trung vào hiệu suất & bảo trì.

### 🚀 Key Features

- 🔐 **JWT Authentication** with refresh tokens
- 🛡️ **RBAC (Role-Based Access Control)** system
- 📁 **Font Management** with categories and tags
- 💰 **Payment Integration** (SePay, VietQR)
- 🔍 **Advanced Query Builder** with JSON Logic
- 📊 **Analytics & Download Tracking**
- 🔄 **Redis Caching** for performance
- 📧 **Background Jobs** with queue system
- 🧪 **Comprehensive Testing** suite

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                         │
│  Web App  │  Mobile App  │  Third-party APIs  │  Admin UI   │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                        │
│              NestJS API Server (Single Instance)            │
│   Controllers │ Services │ Guards │ Middlewares │ Filters    │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                             │
│   PostgreSQL (Primary)  │  Redis (Cache + Sessions)        │
│   User Data │ Business Logic │ Cache │ Rate Limiting         │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Prerequisites

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0 (recommended) or npm
- **Docker** & **Docker Compose**
- **PostgreSQL** >= 14
- **Redis** >= 6

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd nvn-backend
```

### 2. Install Dependencies

```bash
pnpm install
# or
npm install
```

### 3. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env
```

### 4. Start Development Environment

```bash
# Start with Docker Compose
docker-compose up -d

# Or start services individually
docker-compose up -d postgres redis

# Run migrations
pnpm db:migrate

# Start development server
pnpm start:dev
```

### 5. Access Services

- **API Server**: http://localhost:3000
- **Swagger Documentation**: http://localhost:3000/api
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 📝 Available Scripts

### Development

```bash
# Start development server
pnpm start:dev

# Start with debug mode
pnpm start:debug

# Build for production
pnpm build

# Start production server
pnpm start:prod
```

### Code Quality

```bash
# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Type checking
pnpm check-types

# Run all quality checks
pnpm lint:fix:all
```

### Testing

```bash
# Run unit tests
pnpm test

# Run tests with coverage
pnpm test:cov

# Run tests in watch mode
pnpm test:watch

# Run e2e tests
pnpm test:e2e
```

### Database Management

```bash
# Run migrations
pnpm db:migrate

# Undo last migration
pnpm db:migrate:undo

# Undo all migrations
pnpm db:migrate:undo:all

# Create new migration
pnpm migration:create -- --name your-migration-name

# Run seeders
pnpm db:seed:all
```

### Code Generation

```bash
# Generate new module
pnpm generate:module

# Generate query blueprint
pnpm generate:blueprint

# Generate query configurations
pnpm build:config
```

## 🗃️ Database Migrations

### Creating Migrations

```bash
# Create a new migration
pnpm migration:create -- --name add-is-premium-to-users
pnpm migration:create -- --name create-products-table
```

### Migration Best Practices

1. **Tên Rõ Ràng**: Luôn đặt tên migration có ý nghĩa
2. **Tính Thuận Nghịch**: Mọi hàm `up` phải có hàm `down` tương ứng
3. **Không Sửa Đổi Migration Cũ**: Một khi đã chạy trên production, không được sửa đổi
4. **Kiểm Tra Kỹ Lưỡng**: Test cả `migrate` và `migrate:undo`

### Running Migrations

```bash
# Apply all pending migrations
pnpm db:migrate

# Undo last migration
pnpm db:migrate:undo

# Undo specific migration
pnpm sequelize-cli db:migrate:undo --name 20240702123456-add-is-premium-to-users.js
```

## 🛠️ Module Generation

### Quick Module Creation

```bash
# Generate simple module
pnpm generate:module product

# Generate nested module
pnpm generate:module admin/users

# Force overwrite existing module
pnpm generate:module product --force
```

### Generated Structure

```
src/modules/product/
├── controllers/
│   └── product.controller.ts
├── dto/
│   ├── create-product.dto.ts
│   ├── update-product.dto.ts
│   └── product.response.dto.ts
├── entities/
│   └── product.entity.ts
├── services/
│   └── product.service.ts
└── product.module.ts
```

## 📝 Commit Conventions

### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Valid Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Adding or updating tests
- `chore` - Maintenance tasks
- `build` - Build system changes
- `ci` - CI/CD changes
- `revert` - Revert previous commit
- `hotfix` - Critical hotfix

### Valid Scopes

- `api` - API related changes
- `auth` - Authentication
- `config` - Configuration
- `core` - Core functionality
- `database` - Database related
- `deps` - Dependencies
- `security` - Security related
- `ui` - User interface
- `utils` - Utility functions
- `tests` - Test related

### Examples

✅ **Good Examples:**

```bash
feat(auth): add JWT token validation
fix(database): resolve connection timeout issue
docs(api): update endpoint documentation
chore(deps): upgrade typescript to v5.7.3
```

❌ **Bad Examples:**

```bash
update stuff
fixed bug
WIP
```

## 🔐 Authorization System (CASL + RBAC)

### 🎯 CASL Authorization

Hệ thống sử dụng **CASL (Code Access Security Layer)** cho fine-grained permissions và **RBAC** cho role management.

#### Basic Usage with Decorators

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CaslGuard } from '@/modules/casl/guards/casl.guard';
import { Can, CommonAbilities } from '@/modules/casl/decorators/check-abilities.decorator';
import { Subjects } from '@/modules/casl/types/casl.types';

@Controller('users')
@UseGuards(JwtAuthGuard, CaslGuard)
export class UsersController {
    // Basic ability check
    @Get()
    @Can.read(Subjects.User)
    findAll() {
        // User needs 'users:read' permission
    }

    // With conditions
    @Get('profile')
    @Can.read(Subjects.User, { id: 'CURRENT_USER_ID' })
    getProfile() {
        // User can only read their own profile
    }

    // Admin only
    @Delete(':id')
    @Can.admin(Subjects.User)
    deleteUser() {
        // User needs 'users:admin' permission
    }

    // Multiple conditions (ALL must pass)
    @Put('admin/:id')
    @Can.all({ action: 'manage', subject: Subjects.User }, { action: 'admin', subject: Subjects.System })
    promoteToAdmin() {
        // User needs both 'users:manage' AND 'system:admin'
    }

    // Any condition (OR logic)
    @Get('support')
    @Can.any({ action: 'admin', subject: Subjects.User }, { action: 'read', subject: Subjects.System })
    supportAccess() {
        // User needs 'users:admin' OR 'system:read'
    }
}
```

#### Pre-defined Common Abilities

```typescript
import { CommonAbilities } from '@/modules/casl/decorators/check-abilities.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, CaslGuard)
export class AdminController {
    @Get('users')
    @CommonAbilities.ManageUsers
    manageUsers() {}

    @Post('roles')
    @CommonAbilities.CreateRoles
    createRole() {}

    @Put('users/:id/roles')
    @CommonAbilities.AssignRoles
    assignRole() {}

    @Get('system')
    @CommonAbilities.AdminSystem
    systemAdmin() {}

    @Get('analytics')
    @CommonAbilities.ManageAll // Super admin only
    viewAnalytics() {}
}
```

#### Advanced Conditions & Context

```typescript
// Font management with ownership
@Controller('fonts')
@UseGuards(JwtAuthGuard, CaslGuard)
export class FontsController {
    @Get()
    @Can.read(Subjects.Font, { isActive: true })
    getActiveFonts() {}

    @Put(':id')
    @Can.update(Subjects.Font, { authorId: 'CURRENT_USER_ID' })
    updateOwnFont() {}

    @Post(':id/publish')
    @Can.all({ action: 'manage', subject: Subjects.Font }, { action: 'publish', subject: Subjects.Font })
    publishFont() {}

    // Inverted check (user must NOT have ability)
    @Get('premium')
    @Can.not('download', Subjects.Font, { isPremium: true })
    getPremiumFonts() {
        // Only users who CANNOT download premium fonts see this
    }
}
```

### 🛡️ RBAC API Endpoints

```bash
# Role Management
POST /rbac/roles
{
  "name": "content_manager",
  "displayName": "Content Manager",
  "permissionIds": ["permission-uuid-1"]
}

GET /rbac/roles
PUT /rbac/roles/:roleId
DELETE /rbac/roles/:roleId

# Permission Management
POST /rbac/permissions
{
  "name": "fonts:publish",
  "description": "Can publish fonts",
  "resource": "fonts",
  "action": "publish"
}

GET /rbac/permissions
GET /rbac/permissions?resource=fonts
DELETE /rbac/permissions/:permissionId

# User Role Assignment
POST /rbac/users/:userId/roles
{
  "roleId": "role-uuid",
  "expiresAt": "2024-12-31T23:59:59.999Z"
}

POST /rbac/users/roles  # Bulk assignment
{
  "userId": "user-uuid",
  "roleIds": ["role-uuid-1", "role-uuid-2"]
}

DELETE /rbac/users/:userId/roles/:roleId

# Permission Checks
GET /rbac/users/:userId/permissions
GET /rbac/users/:userId/permissions/:permissionName/check
# Response: { "hasPermission": true|false }
```

### 🚀 Programmatic Usage

```typescript
import { AbilityFactory } from '@/modules/casl/factories/ability.factory';
import { RbacService } from '@/modules/users/services/rbac.service';

@Injectable()
export class SomeService {
    constructor(
        private abilityFactory: AbilityFactory,
        private rbacService: RbacService,
    ) {}

    async checkUserPermissions(user: CachedUserData) {
        // Create ability for user
        const ability = this.abilityFactory.createForUser(user);

        // Type-safe ability checks
        const canReadUsers = this.abilityFactory.canRead(ability, Subjects.User);
        const canManageOwnProfile = this.abilityFactory.canUpdate(ability, Subjects.User, { id: user.id });

        // Direct permission checks
        const hasPermission = await this.rbacService.userHasPermission(user.id, 'users:read');

        const hasAnyPermission = await this.rbacService.userHasAnyPermission(user.id, ['users:admin', 'system:admin']);
    }
}
```

### 📋 Permission Naming Convention

```bash
# Format: <resource>:<action>
users:read          # Read user data
users:write         # Create + Update users
users:delete        # Delete users
users:admin         # All user operations
users:manage        # Admin-level management

fonts:read          # View fonts
fonts:download      # Download font files
fonts:upload        # Upload new fonts
fonts:publish       # Publish fonts
fonts:approve       # Approve pending fonts
fonts:admin         # All font operations

system:read         # View system info
system:admin        # System administration
system:manage       # System management

# Special permissions
*:*                 # Super admin (all actions, all resources)
```

## 🔍 Query Builder System

### JSON Logic Integration

```typescript
// Example query
const query = {
  and: [
    { "==": [{ var: "category" }, "sans-serif"] },
    { ">": [{ var: "downloads" }, 100] }
  ]
};

// Use in API
GET /api/fonts?filter=${encodeURIComponent(JSON.stringify(query))}
```

### Blueprint Generation

```bash
# Generate query blueprint for entity
pnpm generate:blueprint

# Select entity and generate optimized query configuration
```

## 🐳 Docker Development

### Services Overview

| Service    | Port | Purpose             |
| ---------- | ---- | ------------------- |
| API        | 3000 | NestJS Application  |
| PostgreSQL | 5432 | Primary Database    |
| Redis      | 6379 | Cache & Sessions    |
| PgAdmin    | 8080 | Database Management |

### Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Restart specific service
docker-compose restart api

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up -d --build
```

## 🔧 Git Hooks & Quality

### Automated Checks

- **Pre-commit**: ESLint, Prettier, Type checking
- **Commit-msg**: Conventional commits validation
- **Pre-push**: Full test suite

### Manual Commands

```bash
# Run pre-commit checks manually
pnpm pre-commit

# Test commit message
echo "feat(api): add new endpoint" | pnpm commitlint

# Bypass hooks (emergency only)
git commit --no-verify -m "emergency fix"
```

## 📊 Performance Expectations

### Concurrent Users

- **Peak Load**: 200 concurrent users
- **Average Load**: 50-100 concurrent users
- **Daily Active Users**: 500-800 users

### Response Times

- **API Endpoints**: < 200ms (95th percentile)
- **Database Queries**: < 50ms average
- **Cache Hits**: < 5ms

## 🚨 Troubleshooting

### Common Issues

#### Database Connection

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Reset database
docker-compose down
docker volume rm nvn-backend_postgres_data
docker-compose up -d
```

#### Redis Connection

```bash
# Check Redis status
docker-compose ps redis

# Clear Redis cache
docker-compose exec redis redis-cli FLUSHALL
```

#### Migration Issues

```bash
# Check migration status
pnpm sequelize-cli db:migrate:status

# Reset migrations (development only)
pnpm db:migrate:undo:all
pnpm db:migrate
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=* pnpm start:dev

# TypeScript compilation issues
pnpm check-types

# Clear node_modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## 📚 Additional Resources

- **Architecture**: See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **RBAC Guide**: See [RBAC-GUIDE.md](./RBAC-GUIDE.md)
- **ESLint Setup**: See [ESLINT-PRETTIER-SETUP.md](./ESLINT-PRETTIER-SETUP.md)
- **Docker Scripts**: See [docker-scripts.md](./docker-scripts.md)
- **Cursor Setup**: See [cursor-setup.md](./cursor-setup.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feat/amazing-feature`
3. Commit changes: `git commit -m 'feat(scope): add amazing feature'`
4. Push to branch: `git push origin feat/amazing-feature`
5. Open Pull Request

## 📝 License

This project is [UNLICENSED](./LICENSE).

---

**Questions?** Check the project documentation or ask the team! 🚀
