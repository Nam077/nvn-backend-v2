export default {
    '*.{js,jsx,ts,tsx}': [
        'eslint --fix --max-warnings 0',
        'prettier --write',
    ],
    '*.{json,yml,yaml}': [
        'prettier --write',
    ],
    '*.md': [
        'prettier --write',
    ],
    'package.json': [
        'prettier --write',
        'sort-package-json',
    ],
}; 