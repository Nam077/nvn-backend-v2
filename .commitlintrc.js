module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'type-enum': [
            2,
            'always',
            [
                'build',   // Changes that affect the build system or external dependencies
                'chore',   // Other changes that don't modify src or test files
                'ci',      // Changes to our CI configuration files and scripts
                'docs',    // Documentation only changes
                'feat',    // A new feature
                'fix',     // A bug fix
                'perf',    // A code change that improves performance
                'refactor', // A code change that neither fixes a bug nor adds a feature
                'revert',  // Reverts a previous commit
                'style',   // Changes that do not affect the meaning of the code
                'test',    // Adding missing tests or correcting existing tests
                'hotfix',  // Critical hotfix
            ],
        ],
        'scope-enum': [
            2,
            'always',
            [
                'api',      // API related changes
                'auth',     // Authentication related
                'config',   // Configuration changes
                'core',     // Core functionality
                'database', // Database related
                'deps',     // Dependencies
                'security', // Security related
                'ui',       // User interface
                'utils',    // Utility functions
                'tests',    // Test related
                'docs',     // Documentation
                'build',    // Build system
                'ci',       // CI/CD related
            ],
        ],
        'subject-case': [2, 'always', 'lower-case'],
        'subject-empty': [2, 'never'],
        'subject-max-length': [2, 'always', 72],
        'header-max-length': [2, 'always', 100],
        'body-max-line-length': [2, 'always', 100],
        'footer-max-line-length': [2, 'always', 100],
        'type-case': [2, 'always', 'lower-case'],
        'type-empty': [2, 'never'],
        'scope-case': [2, 'always', 'lower-case'],
    },
    helpUrl: 'https://github.com/conventional-changelog/commitlint/#what-is-commitlint',
}; 