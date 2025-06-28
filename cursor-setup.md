# Cursor Setup & Configuration Guide

## 📋 Overview

This guide explains the Cursor AI editor configuration for the NVN Font Backend project. The setup includes ESLint integration, custom rules, and productivity shortcuts.

## 🗂️ Configuration Files

### 1. `.cursorrules`

**Purpose**: Main configuration file for Cursor AI assistant

- Defines project context (NestJS + TypeScript + PostgreSQL)
- Establishes coding standards and best practices
- Provides examples for common patterns
- Includes security guidelines and performance tips

### 2. `.vscode/settings.json`

**Purpose**: Editor settings for optimal development experience

- ESLint integration with auto-fix on save
- TypeScript configuration
- Import organization and formatting
- Path intellisense for `@` aliases
- File associations and exclusions

### 3. `.vscode/tasks.json`

**Purpose**: Quick access to common development tasks

- Linting and formatting commands
- Test running (unit, e2e, coverage)
- Build and development server
- Blueprint and query config generation
- Docker operations

## 🚀 Quick Start

### 1. Verify Configuration

```bash
# Check if all config files exist
ls -la .cursorrules .vscode/settings.json .vscode/tasks.json

# Verify ESLint is working
pnpm lint

# Check TypeScript compilation
npx tsc --noEmit
```

### 2. Test Cursor Integration

1. Open any TypeScript file
2. Make a small syntax error
3. Save the file - should auto-fix with ESLint
4. Try AI assistance with `Cmd+K` (ask about code patterns)

### 3. Use Quick Tasks

- `Cmd+Shift+P` → "Tasks: Run Task"
- Choose from available tasks like:
    - 🧹 Lint & Fix All
    - 🧪 Run Tests
    - 🚀 Start Development
    - 📊 Generate Blueprint

## 🛠️ Key Features

### Auto-Formatting & Linting

- **On Save**: Auto-fix ESLint issues + organize imports
- **On Paste**: Format pasted code
- **Remove Unused**: Clean up unused imports automatically

### AI-Powered Assistance

- Context-aware suggestions based on `.cursorrules`
- Understands NestJS patterns and project structure
- Helps with TypeScript types and decorators
- Suggests security best practices

### Path Intellisense

- `@/` → `src/`
- `@modules/` → `src/modules/`
- `@common/` → `src/common/`

### Problem Matching

- ESLint errors highlighted in editor
- TypeScript type errors with quick fixes
- Jest test failures with jump-to-location

## 📝 Coding Standards Summary

### Import Order

```typescript
// 1. NestJS imports
import { Injectable, Controller } from '@nestjs/common';

// 2. External libraries
import { isEmpty } from 'lodash';

// 3. Internal imports with @
import { UserEntity } from '@/modules/users/entities/user.entity';

// 4. Relative imports
import { LocalService } from './local.service';
```

### Function Style

```typescript
// ✅ Use arrow functions outside classes
const processUser = async (user: User): Promise<ProcessedUser> => {
    return {
        id: user.id,
        name: user.name,
        isActive: user.isActive,
    };
};

// ✅ Use methods in classes
@Injectable()
export class UserService {
    async findById(id: string): Promise<User> {
        return this.userRepository.findByPk(id);
    }
}
```

### Error Handling

```typescript
// ✅ Use NestJS exceptions
throw new NotFoundException('User not found');
throw new BadRequestException('Invalid input data');

// ✅ Handle database errors
try {
    return await this.userRepository.create(userData);
} catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictException('Email already exists');
    }
    throw new InternalServerErrorException('User creation failed');
}
```

## 🔧 Customization

### Adding New Rules

Edit `.cursorrules` to add project-specific patterns:

```markdown
## Custom Business Logic Rules

### Font Processing

- Always validate font file headers before processing
- Use streaming for files larger than 10MB
- Implement proper cleanup on processing failures

### Subscription Management

- Check subscription status before premium operations
- Log subscription changes for audit trail
- Handle grace period for expired subscriptions
```

### ESLint Rule Overrides

Add to `eslint.config.mjs`:

```javascript
{
    rules: {
        // Custom project rules
        'custom-rule-name': 'error',
        '@typescript-eslint/no-explicit-any': 'warn', // Override existing
    }
}
```

### New VSCode Tasks

Add to `.vscode/tasks.json`:

```json
{
    "label": "🔥 Custom Task",
    "type": "shell",
    "command": "pnpm",
    "args": ["run", "custom-script"],
    "group": "build"
}
```

## 🧪 Testing the Setup

### 1. ESLint Integration Test

```typescript
// Create this in a test file - should auto-fix on save
const badCode = (user) => {
    const name = user['name'];
    return name;
};

// Should become:
const badCode = (user: any): any => {
    const name = user.name;
    return name;
};
```

### 2. AI Assistant Test

Ask Cursor AI:

> "Create a NestJS service for managing font collections with proper error handling"

Should generate code following the established patterns.

### 3. Import Organization Test

```typescript
// Paste this - should auto-organize
import { LocalService } from './local.service';
import { UserEntity } from '@/modules/users/entities/user.entity';
import { isEmpty } from 'lodash';
import { Injectable } from '@nestjs/common';
```

## 📊 Available Tasks

| Task                  | Command             | Description                  |
| --------------------- | ------------------- | ---------------------------- |
| 🧹 Lint & Fix All     | `pnpm lint:fix`     | Fix all ESLint issues        |
| 🔍 Lint Check         | `pnpm lint`         | Check for linting errors     |
| 🎨 Format Code        | `pnpm format`       | Format code with Prettier    |
| 🧪 Run Tests          | `pnpm test`         | Run unit tests               |
| 🧪 Test Coverage      | `pnpm test:cov`     | Generate coverage report     |
| 🚀 Start Development  | `pnpm start:dev`    | Start dev server with watch  |
| 🏗️ Build Project      | `pnpm build`        | Build for production         |
| 📊 Generate Blueprint | Custom script       | Generate query blueprint     |
| 🐳 Docker Up          | `docker-compose up` | Start development containers |

## 🚨 Troubleshooting

### ESLint Not Working

```bash
# Restart TypeScript server
Cmd+Shift+P → "TypeScript: Restart TS Server"

# Check ESLint output
Cmd+Shift+P → "ESLint: Show Output Channel"
```

### Cursor AI Not Responding

```bash
# Check Cursor settings
Cmd+, → Search "cursor"

# Verify .cursorrules is being read
# Add a comment at top and ask AI about it
```

### Import Path Issues

```bash
# Verify tsconfig paths
cat tsconfig.json | grep paths

# Check VSCode path mappings
# Look in .vscode/settings.json "path-intellisense.mappings"
```

## 🎯 Best Practices

1. **Use AI Wisely**: Ask for explanations, not just code generation
2. **Follow Patterns**: Stick to established project patterns
3. **Test Early**: Use tasks for quick feedback loops
4. **Document Changes**: Update .cursorrules when adding new patterns
5. **Share Context**: Include relevant files when asking AI questions

## 📚 Resources

- [Cursor Documentation](https://docs.cursor.so/)
- [ESLint Configuration](./eslint.config.mjs)
- [NestJS Best Practices](https://docs.nestjs.com/fundamentals/testing)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Setup Complete!** 🎉 Your Cursor editor is now optimized for NVN Font Backend development.

To verify everything is working:

1. Open a TypeScript file
2. Save it (should auto-format)
3. Run `Cmd+Shift+P` → "Tasks: Run Task" → "🧹 Lint & Fix All"
4. Ask Cursor AI: "Explain the JsonLogic to SQL builder pattern"
