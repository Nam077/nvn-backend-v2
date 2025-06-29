/**
 * A comprehensive mapping from user-friendly operator names used in blueprint definitions
 * to the actual operators required by json-logic. This is the single source of truth for all operators.
 */
export const ALL_OPERATORS_MAP: Record<string, string> = {
    // --- Standard Comparison ---
    equals: '==',
    not_equals: '!=',

    // --- Strict Comparison (rarely used in this context but included for completeness) ---
    strict_equals: '===',
    strict_not_equals: '!==',

    // --- Numeric Comparison ---
    gt: '>',
    gte: '>=',
    lt: '<',
    lte: '<=',
    between: 'between',
    not_between: 'not_between',

    // --- Text Search ---
    contains: 'contains',
    not_contains: 'not_contains',
    like: 'like',
    not_like: 'not_like',
    starts_with: 'starts_with',
    ends_with: 'ends_with',

    // --- Null & Empty Checks ---
    is_empty: 'is_empty',
    is_not_empty: 'is_not_empty',
    is_null: 'is_null',
    is_not_null: 'is_not_null',

    // --- Array & Set Operations ---
    in: 'in',
    not_in: 'not_in',
    array_overlaps: 'array_overlaps',

    // --- JSONB Operations (Custom) ---
    json_equals: 'json_equals',
    json_contains: 'json_contains',
    json_in: 'json_in',
};

/**
 * A set of operators whose names are the same in both blueprints and json-logic.
 */
export const NATIVE_OPERATORS = new Set([
    'in',
    'contains',
    // Add other operators that don't need mapping
]);
