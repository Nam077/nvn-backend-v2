module.exports = {
    // TypeScript and JavaScript files
    '*.{js,jsx,ts,tsx}': [
        'eslint --fix --max-warnings 0',
        'prettier --write',
    ],
    
    // JSON and configuration files
    '*.{json,yml,yaml}': [
        'prettier --write',
    ],
    
    // Markdown files
    '*.md': [
        'prettier --write',
    ],
    
    // CSS and SCSS files
    '*.{css,scss,sass}': [
        'prettier --write',
    ],
    
    // Package.json specific formatting
    'package.json': [
        'prettier --write',
        'sort-package-json',
    ],
    
    // TypeScript files - additional type checking
    '*.{ts,tsx}': [
        () => 'tsc --noEmit --skipLibCheck',
    ],
    
    // Test files - run related tests
    '*.{test,spec}.{js,jsx,ts,tsx}': [
        'jest --bail --findRelatedTests --passWithNoTests',
    ],
}; 