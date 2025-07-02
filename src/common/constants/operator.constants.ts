/**
 * This file serves as the single source of truth for all query operators.
 * It defines user-friendly operator groups and a comprehensive map to
 * the actual operators used by json-logic and the database.
 */

import { invert, mapValues } from 'lodash';

// --- Operator Groups ---

export const STRING_OPERATORS = {
    EQUALS: 'equals',
    NOT_EQUALS: 'not_equals',
    CONTAINS: 'contains',
    NOT_CONTAINS: 'not_contains',
    LIKE: 'like',
    NOT_LIKE: 'not_like',
    STARTS_WITH: 'starts_with',
    ENDS_WITH: 'ends_with',
    IS_EMPTY: 'is_empty',
    IS_NOT_EMPTY: 'is_not_empty',
    IS_NULL: 'is_null',
    IS_NOT_NULL: 'is_not_null',
    IN: 'in',
    NOT_IN: 'not_in',
} as const;

export const NUMBER_OPERATORS = {
    EQUALS: 'equals',
    NOT_EQUALS: 'not_equals',
    GT: 'gt',
    GTE: 'gte',
    LT: 'lt',
    LTE: 'lte',
    BETWEEN: 'between',
    NOT_BETWEEN: 'not_between',
    IS_NULL: 'is_null',
    IS_NOT_NULL: 'is_not_null',
} as const;

export const DATE_OPERATORS = {
    EQUALS: 'equals',
    NOT_EQUALS: 'not_equals',
    GT: 'gt',
    GTE: 'gte',
    LT: 'lt',
    LTE: 'lte',
    BETWEEN: 'between',
    IS_NULL: 'is_null',
    IS_NOT_NULL: 'is_not_null',
} as const;

export const BOOLEAN_OPERATORS = {
    EQUALS: 'equals',
    IS_NULL: 'is_null',
    IS_NOT_NULL: 'is_not_null',
} as const;

export const ENUM_OPERATORS = {
    EQUALS: 'equals',
    NOT_EQUALS: 'not_equals',
    IN: 'in',
    NOT_IN: 'not_in',
    IS_NULL: 'is_null',
    IS_NOT_NULL: 'is_not_null',
} as const;

export const ARRAY_OPERATORS = {
    OVERLAPS: 'array_overlaps',
    CONTAINS: 'array_contains', // For checking if a JSONB array contains a value
} as const;

export const JSON_OPERATORS = {
    EQUALS: 'json_equals',
    CONTAINS: 'json_contains',
    IN: 'json_in',
    ARRAY_TEXT_CONTAINS: 'json_array_text_contains', // Custom op for searching text in a json array
} as const;

export const LOGIC_OPERATORS = {
    AND: 'and',
    OR: 'or',
    IF: 'if',
    TERNARY: '?:',
    VAR: 'var',
} as const;

/**
 * A comprehensive mapping from user-friendly operator names used in blueprint definitions
 * to their actual JSON Logic implementation and metadata. This is the single source of truth.
 */
export const ALL_OPERATORS_MAP: Record<string, { op: string; arity: number | number[] }> = {
    // --- Standard Comparison ---
    [STRING_OPERATORS.EQUALS]: { op: '==', arity: 2 },
    [STRING_OPERATORS.NOT_EQUALS]: { op: '!=', arity: 2 },

    // --- Strict Comparison ---
    strict_equals: { op: '===', arity: 2 },
    strict_not_equals: { op: '!==', arity: 2 },

    // --- Numeric Comparison ---
    [NUMBER_OPERATORS.GT]: { op: '>', arity: 2 },
    [NUMBER_OPERATORS.GTE]: { op: '>=', arity: 2 },
    [NUMBER_OPERATORS.LT]: { op: '<', arity: 2 },
    [NUMBER_OPERATORS.LTE]: { op: '<=', arity: 2 },
    [NUMBER_OPERATORS.BETWEEN]: { op: 'between', arity: 3 },
    [NUMBER_OPERATORS.NOT_BETWEEN]: { op: 'not_between', arity: 3 },

    // --- Text Search ---
    [STRING_OPERATORS.CONTAINS]: { op: 'contains', arity: 2 },
    [STRING_OPERATORS.NOT_CONTAINS]: { op: 'not_contains', arity: 2 },
    [STRING_OPERATORS.LIKE]: { op: 'like', arity: 2 },
    [STRING_OPERATORS.NOT_LIKE]: { op: 'not_like', arity: 2 },
    [STRING_OPERATORS.STARTS_WITH]: { op: 'starts_with', arity: 2 },
    [STRING_OPERATORS.ENDS_WITH]: { op: 'ends_with', arity: 2 },

    // --- Null & Empty Checks ---
    [STRING_OPERATORS.IS_EMPTY]: { op: 'is_empty', arity: 1 },
    [STRING_OPERATORS.IS_NOT_EMPTY]: { op: 'is_not_empty', arity: 1 },
    [STRING_OPERATORS.IS_NULL]: { op: 'is_null', arity: 1 },
    [STRING_OPERATORS.IS_NOT_NULL]: { op: 'is_not_null', arity: 1 },

    // --- Array & Set Operations ---
    [STRING_OPERATORS.IN]: { op: 'in', arity: 2 },
    [STRING_OPERATORS.NOT_IN]: { op: 'not_in', arity: 2 },
    [ARRAY_OPERATORS.OVERLAPS]: { op: 'array_overlaps', arity: 2 },
    [ARRAY_OPERATORS.CONTAINS]: { op: 'array_contains', arity: 2 },

    // --- JSONB Operations (Custom) ---
    [JSON_OPERATORS.EQUALS]: { op: 'json_equals', arity: 2 },
    [JSON_OPERATORS.CONTAINS]: { op: 'json_contains', arity: 2 },
    [JSON_OPERATORS.IN]: { op: 'json_in', arity: 2 },
    [JSON_OPERATORS.ARRAY_TEXT_CONTAINS]: { op: 'json_array_text_contains', arity: 2 },
};

/**
 * An inverted map to look up a friendly operator name from its logic implementation.
 * e.g., LOGIC_TO_FRIENDLY_MAP['=='] will return 'equals'.
 */
export const LOGIC_TO_FRIENDLY_MAP = invert(mapValues(ALL_OPERATORS_MAP, (v) => v.op));

/**
 * A set of operators whose names are the same in both blueprints and json-logic.
 */
export const NATIVE_OPERATORS = new Set([
    'in',
    'contains',
    // Add other operators that don't need mapping
]);
