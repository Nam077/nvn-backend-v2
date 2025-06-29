/**
 * This file contains standardized operator constants for the query builder.
 * Using these constants ensures consistency and prevents typos across different blueprints.
 */

// For String, Number, Date, Enum
export const GENERIC_COMPARATORS = {
    EQUALS: 'equals',
    NOT_EQUALS: 'not_equals',
} as const;

// For String, Number, Date, Enum, Boolean
export const NULL_CHECK_OPERATORS = {
    IS_NULL: 'is_null',
    IS_NOT_NULL: 'is_not_null',
} as const;

export const STRING_OPERATORS = {
    ...GENERIC_COMPARATORS,
    ...NULL_CHECK_OPERATORS,
    CONTAINS: 'contains',
    NOT_CONTAINS: 'not_contains',
    LIKE: 'like',
    NOT_LIKE: 'not_like',
    STARTS_WITH: 'starts_with',
    ENDS_WITH: 'ends_with',
    IS_EMPTY: 'is_empty',
    IS_NOT_EMPTY: 'is_not_empty',
    IN: 'in',
    NOT_IN: 'not_in',
} as const;

export const NUMBER_OPERATORS = {
    ...GENERIC_COMPARATORS,
    ...NULL_CHECK_OPERATORS,
    GT: 'gt', // greater than
    GTE: 'gte', // greater than or equal
    LT: 'lt', // less than
    LTE: 'lte', // less than or equal
    BETWEEN: 'between',
    NOT_BETWEEN: 'not_between',
    IN: 'in',
    NOT_IN: 'not_in',
} as const;

export const DATE_OPERATORS = {
    ...NUMBER_OPERATORS, // Dates can use the same > < = operators
} as const;

export const ENUM_OPERATORS = {
    ...GENERIC_COMPARATORS,
    ...NULL_CHECK_OPERATORS,
    IN: 'in',
    NOT_IN: 'not_in',
} as const;

export const BOOLEAN_OPERATORS = {
    EQUALS: 'equals',
    IN: 'in',
    ...NULL_CHECK_OPERATORS,
} as const;

export const JSON_OPERATORS = {
    JSON_EQUALS: 'json_equals',
    JSON_CONTAINS: 'json_contains',
    JSON_IN: 'json_in',
} as const;

export const ARRAY_OPERATORS = {
    OVERLAPS: 'array_overlaps', // Checks if two arrays have elements in common (&& operator in PostgreSQL)
    IS_EMPTY: 'is_empty', // Checks if array is empty
    IS_NOT_EMPTY: 'is_not_empty', // Checks if array is not empty
} as const;
