/**
 * A mapping from user-friendly operator names used in blueprint definitions
 * to the actual operators required by json-logic.
 */
export const OPERATOR_FRIENDLY_TO_JSON_LOGIC: Record<string, string> = {
    equals: '==',
    not_equals: '!=',
    strict_equals: '===',
    strict_not_equals: '!==',
    gt: '>',
    gte: '>=',
    lt: '<',
    lte: '<=',
};

/**
 * A set of operators whose names are the same in both blueprints and json-logic.
 */
export const NATIVE_OPERATORS = new Set(['in', 'contains']);
