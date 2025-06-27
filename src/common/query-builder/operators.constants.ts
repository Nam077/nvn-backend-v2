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
    STARTS_WITH: 'starts_with',
    ENDS_WITH: 'ends_with',
    IS_EMPTY: 'is_empty',
    IS_NOT_EMPTY: 'is_not_empty',
} as const;

export const NUMBER_OPERATORS = {
    ...GENERIC_COMPARATORS,
    ...NULL_CHECK_OPERATORS,
    GT: 'gt', // greater than
    GTE: 'gte', // greater than or equal
    LT: 'lt', // less than
    LTE: 'lte', // less than or equal
    BETWEEN: 'between',
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
    ...NULL_CHECK_OPERATORS,
} as const;
