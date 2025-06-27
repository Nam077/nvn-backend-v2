/**
 * A mapping from user-friendly operator names used in blueprint definitions
 * to the actual operators required by json-logic.
 */
export const OPERATOR_FRIENDLY_TO_JSON_LOGIC: Record<string, string> = {
    // Basic comparison operators
    equals: '==',
    not_equals: '!=',
    strict_equals: '===',
    strict_not_equals: '!==',

    // Numeric comparison operators
    gt: '>',
    gte: '>=',
    lt: '<',
    lte: '<=',

    // Text search operators
    like: 'like',
    not_like: 'not_like',
    starts_with: 'starts_with',
    ends_with: 'ends_with',
    not_contains: 'not_contains',

    // Empty/null check operators
    is_empty: 'is_empty',
    is_not_empty: 'is_not_empty',
    is_null: 'is_null',
    is_not_null: 'is_not_null',

    // Array/set operators
    not_in: 'not_in',

    // Range operators
    between: 'between',
    not_between: 'not_between',
};

/**
 * A set of operators whose names are the same in both blueprints and json-logic.
 */
export const NATIVE_OPERATORS = new Set([
    'in',
    'contains',
    // Add other operators that don't need mapping
]);
