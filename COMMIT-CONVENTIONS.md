# 📝 Commit Conventions & Git Hooks Setup (2025)

## 🚀 Overview

This project uses modern tools to enforce code quality and commit conventions:

- **Husky v9.1.7** - Git hooks management
- **lint-staged v16.1.2** - Run linters on staged files
- **Commitlint v19.8.1** - Conventional commit messages
- **ESLint & Prettier** - Code formatting and linting

## 🔧 Automated Checks

### Pre-commit Hook

- Runs ESLint with auto-fix
- Formats code with Prettier
- Type checking with TypeScript
- Runs tests for changed files
- Sorts package.json

### Commit Message Hook

- Validates commit message format
- Enforces conventional commits
- Checks message length and case

### Pre-push Hook

- Runs full test suite
- Ensures project builds successfully

## 📋 Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Valid Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
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
- `docs` - Documentation
- `build` - Build system
- `ci` - CI/CD related

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

## 🛠️ Manual Commands

### Lint and Format

```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format all files
npm run format

# Run lint-staged manually
npm run pre-commit
```

### Type Checking

```bash
# Check TypeScript types
npm run check-types
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:cov

# Watch mode
npm run test:watch
```

### Commit Message Validation

```bash
# Test commit message (manual)
echo "feat(api): add new endpoint" | npm run commitlint
```

## 🔄 Bypassing Hooks (Emergency Only)

Sometimes you may need to bypass hooks in emergency situations:

```bash
# Skip pre-commit hooks
git commit --no-verify -m "emergency fix"

# Skip all hooks
HUSKY=0 git commit -m "emergency commit"
```

## 📁 Configuration Files

- `.commitlintrc.js` - Commitlint configuration
- `.lintstagedrc.js` - Lint-staged configuration
- `.husky/` - Git hooks directory
- `eslint.config.mjs` - ESLint configuration
- `.prettierrc` - Prettier configuration

## 🚨 Troubleshooting

### Hook Not Running

```bash
# Reinstall husky
npm run prepare

# Check hook permissions
ls -la .husky/
```

### Commitlint Issues

```bash
# Test configuration
npx commitlint --from HEAD~1 --to HEAD --verbose
```

### Lint-staged Issues

```bash
# Debug mode
DEBUG=lint-staged* npm run pre-commit
```

## 🔄 Setup for New Team Members

1. Clone repository
2. Install dependencies: `npm install`
3. Hooks will be automatically set up via `prepare` script
4. Make a test commit to verify setup

## 📊 Benefits

- ✅ Consistent code formatting
- ✅ No linting errors in commits
- ✅ Conventional commit messages
- ✅ Type safety before commits
- ✅ Prevents broken builds
- ✅ Automated quality gates
- ✅ Better collaboration
- ✅ Easier code reviews

---

**Questions?** Check the project documentation or ask the team! 🚀
