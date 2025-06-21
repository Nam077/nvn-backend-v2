// @ts-check
import eslint from '@eslint/js';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import * as importX from 'eslint-plugin-import-x';
import jestPlugin from 'eslint-plugin-jest';
import jsdocPlugin from 'eslint-plugin-jsdoc';
import lodashPlugin from 'eslint-plugin-lodash';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import securityPlugin from 'eslint-plugin-security';
import sonarjsPlugin from 'eslint-plugin-sonarjs';
import sortClassMembersPlugin from 'eslint-plugin-sort-class-members';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'migrations/**', 'dist/**', 'node_modules/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.json'],
      },
    },
  },
  // Import & Unused Imports
  {
    plugins: {
      'import-x': importX,
      'unused-imports': unusedImportsPlugin,
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({
          alwaysTryTypes: true,
          project: './tsconfig.json',
          extensions: ['.ts', '.tsx', '.d.ts', '.js', '.jsx', '.json', '.node'],
        }),
      ],
    },
    rules: {
      'import-x/no-unresolved': 'error',
      'import-x/order': [
        'error',
        {
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
          groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [
            {
              pattern: '@nestjs/**',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '@*/**',
              group: 'internal',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
        },
      ],
      'import-x/no-duplicates': 'error',
      'import-x/newline-after-import': 'error',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
    },
  },
  // Code Quality (SonarJS)
  {
    plugins: {
      sonarjs: sonarjsPlugin,
    },
    rules: {
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-duplicate-string': 'error',
      'sonarjs/cognitive-complexity': ['error', 15],
      'sonarjs/no-nested-template-literals': 'warn',
      'sonarjs/prefer-immediate-return': 'error',
    },
  },
  // Security
  {
    plugins: {
      security: securityPlugin,
    },
    rules: {
      'security/detect-object-injection': 'error',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
    },
  },
  // Jest Testing
  {
    plugins: {
      jest: jestPlugin,
    },
            rules: {
            'jest/no-identical-title': 'error',
            'jest/valid-expect': 'error',
            'jest/expect-expect': [
                'warn',
                {
                    assertFunctionNames: ['expect', 'request.**.expect'],
                },
            ],
        },
  },
  // JSDoc Documentation
  {
    plugins: {
      jsdoc: jsdocPlugin,
    },
    rules: {
      'jsdoc/check-alignment': 'warn',
      'jsdoc/check-param-names': 'warn',
      'jsdoc/check-types': 'warn',
      'jsdoc/require-jsdoc': 'warn',
      'jsdoc/require-param': 'warn',
      'jsdoc/require-param-description': 'warn',
      'jsdoc/require-returns': 'warn',
      'jsdoc/require-returns-description': 'warn',
    },
  },
  // TypeScript Specific
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/method-signature-style': ['error', 'property'],
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },
  // Performance & Best Practices
  {
    rules: {
      'no-unused-vars': 'off',
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-param-reassign': 'warn',
      'array-callback-return': 'error',
      'max-nested-callbacks': ['warn', 3],
      'no-unneeded-ternary': 'warn',
      'no-nested-ternary': 'warn',
      'prefer-destructuring': 'warn',
      'prefer-template': 'warn',
      'no-else-return': 'warn',
      'arrow-body-style': ['error', 'as-needed'],
    },
  },
  // Code Style & Formatting
  {
    rules: {
      'key-spacing': ['error', { beforeColon: false, afterColon: true }],
      'keyword-spacing': ['error', { before: true, after: true }],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'space-in-parens': ['error', 'never'],
      'space-before-blocks': ['error', 'always'],
                  'quotes': ['error', 'single', { avoidEscape: true }],
            'semi': ['error', 'always'],
            'comma-dangle': ['error', 'always-multiline'],
    },
  },
  // Function Style
  {
    rules: {
      'func-style': ['error', 'expression'],
      'arrow-parens': ['error', 'always'],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'FunctionDeclaration:not(ClassBody FunctionDeclaration)',
          message: 'Use arrow functions outside of classes instead of function declarations',
        },
      ],
    },
  },
  // Class Member Organization (NestJS Friendly)
  {
    plugins: {
      'sort-class-members': sortClassMembersPlugin,
    },
    rules: {
      'sort-class-members/sort-class-members': [
        'error',
        {
          order: [
            '[static-properties]',
            '[properties]',
            '[conventional-private-properties]',
            'constructor',
            '[static-methods]',
            '[methods]',
            '[conventional-private-methods]',
          ],
          accessorPairPositioning: 'getThenSet',
          stopAfterFirstProblem: false,
        },
      ],
    },
  },

  // Lodash Optimization
  {
    plugins: {
      lodash: lodashPlugin,
    },
    rules: {
      'lodash/prefer-lodash-method': [
        'error',
        {
          except: ['find', 'map', 'filter'],
          ignoreMethods: ['find', 'findOne', 'save', 'create', 'update', 'delete'],
          ignoreObjects: ['repository', 'Repository', 'QueryBuilder'],
        },
      ],
      'lodash/prefer-get': 'error',
      'lodash/identity-shorthand': ['error', 'always'],
    },
  },
);