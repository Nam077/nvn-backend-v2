/**
 * JsonLogic to SQL Builder
 *
 * This utility class converts JsonLogic expressions into SQL WHERE clauses.
 * It's designed to be extensible and customizable for different use cases.
 *
 * Usage:
 * ```typescript
 * const builder = new JsonLogicToSqlBuilder();
 * const sql = builder.build(jsonLogicRule);
 * ```
 *
 * For custom behavior, extend the class:
 * ```typescript
 * class CustomSqlBuilder extends JsonLogicToSqlBuilder {
 *   protected mapFieldName(field: string): string {
 *     return `custom_${field}`;
 *   }
 * }
 * ```
 */

import {
    isArray,
    isBoolean,
    isEmpty,
    isNumber,
    isObject,
    isString,
    keys,
    map,
    some,
    every,
    includes,
    split,
    join,
} from 'lodash';

// --- Type definitions for JsonLogic ---
type JsonLogicPrimitive = string | number | boolean | null;

interface JsonLogicVarNode {
    var: string;
}

// A rule can be a node with an operator and arguments.
// The arguments can be other rules, variables, or primitives.
export interface JsonLogicRuleNode {
    [operator: string]: JsonLogicArgument;
}

type JsonLogicArgument = JsonLogicRuleNode | JsonLogicVarNode | JsonLogicPrimitive | JsonLogicArgument[];

// Type guards to ensure type safety
const isJsonLogicVarNode = (arg: unknown): arg is JsonLogicVarNode =>
    isObject(arg) && 'var' in arg && isString((arg as JsonLogicVarNode).var);

const isJsonLogicRuleNode = (arg: unknown): arg is JsonLogicRuleNode =>
    isObject(arg) && !isJsonLogicVarNode(arg) && !isArray(arg) && keys(arg).length === 1;

type FieldValueTuple = [string, JsonLogicPrimitive | JsonLogicPrimitive[]];

// Allowed operators for security
const ALLOWED_OPERATORS = new Set([
    'and',
    'or',
    'not',
    '==',
    'equals',
    '!=',
    'not_equals',
    '>',
    'gt',
    '>=',
    'gte',
    '<',
    'lt',
    '<=',
    'lte',
    'contains',
    'not_contains',
    'starts_with',
    'ends_with',
    'like',
    'not_like',
    'in',
    'not_in',
    'is_null',
    'is_not_null',
    'between',
    'not_between',
    'is_empty',
    'is_not_empty',
]);

export interface SqlBuildOptions {
    /**
     * The table alias to use for field names (e.g., 'u' for users)
     */
    tableAlias?: string;

    /**
     * Custom field mapping function
     */
    fieldMapper?: (field: string) => string;

    /**
     * Custom value escaping function
     */
    valueEscaper?: (value: any) => string;

    /**
     * Whether to wrap the final result in parentheses
     */
    wrapInParentheses?: boolean;

    /**
     * A map of entity names to their SQL aliases
     */
    aliasMap?: Map<string, string>;
}

export interface SqlBuildResult {
    sql: string;
    parameters: Record<string, any>;
}

export class JsonLogicToSqlBuilder {
    private paramCounter = 0;
    private parameters: Record<string, any> = {};
    private options: SqlBuildOptions;

    constructor(options: SqlBuildOptions = {}) {
        this.options = {
            wrapInParentheses: true,
            ...options,
        };
    }

    /**
     * Main method to build SQL from JsonLogic rule
     * @param rule - JsonLogic rule object
     * @returns SQL build result with query and parameters
     */
    build(rule: JsonLogicRuleNode): SqlBuildResult {
        if (isEmpty(rule)) {
            return { sql: '1 = 1', parameters: this.parameters };
        }

        const sql = this.buildCondition(rule);
        const finalSql = this.options.wrapInParentheses ? `(${sql})` : sql;

        return {
            sql: finalSql,
            parameters: this.parameters,
        };
    }

    /**
     * Build a single condition from JsonLogic rule
     * @param rule - JsonLogic rule object
     * @returns SQL condition string
     */
    public buildCondition(rule: JsonLogicRuleNode): string {
        const [operator] = keys(rule);

        // Security: Validate operator is allowed
        if (!ALLOWED_OPERATORS.has(operator)) {
            throw new Error(`Unsupported JsonLogic operator: ${operator}`);
        }

        const operands = rule[operator as keyof typeof rule];

        switch (operator) {
            // Logical operators
            case 'and':
            case 'or': {
                if (!isArray(operands)) throw new Error('AND/OR operator requires an array of operands');
                const conditions = map(operands, (op) => {
                    if (!isJsonLogicRuleNode(op)) throw new Error('Invalid operand for AND/OR');
                    return this.buildCondition(op);
                });
                return `(${conditions.join(operator === 'and' ? ' AND ' : ' OR ')})`;
            }
            case 'not': {
                if (!isJsonLogicRuleNode(operands)) throw new Error('Invalid operand for NOT');
                return `NOT (${this.buildCondition(operands)})`;
            }

            // Comparison operators
            case '==':
            case 'equals':
                return this.buildComparisonCondition('=', operands);
            case '!=':
            case 'not_equals':
                return this.buildComparisonCondition('!=', operands);
            case '>':
            case 'gt':
                return this.buildComparisonCondition('>', operands);
            case '>=':
            case 'gte':
                return this.buildComparisonCondition('>=', operands);
            case '<':
            case 'lt':
                return this.buildComparisonCondition('<', operands);
            case '<=':
            case 'lte':
                return this.buildComparisonCondition('<=', operands);

            // String operators
            case 'contains':
                return this.buildLikeCondition(operands, true, true);
            case 'not_contains':
                return this.buildLikeCondition(operands, true, true, true);
            case 'starts_with':
                return this.buildLikeCondition(operands, false, true);
            case 'ends_with':
                return this.buildLikeCondition(operands, true, false);
            case 'like':
                return this.buildLikeCondition(operands, false, false);
            case 'not_like':
                return this.buildLikeCondition(operands, false, false, true);

            // Array operators
            case 'in':
                return this.buildInCondition(operands, false);
            case 'not_in':
                return this.buildInCondition(operands, true);

            // Null checks
            case 'is_null':
            case 'is_not_null': {
                const field = this.extractFieldName(operands);
                return `${this.mapFieldName(field)} IS ${operator === 'is_null' ? 'NULL' : 'NOT NULL'}`;
            }

            // Range operators
            case 'between':
            case 'not_between':
                return this.buildBetweenCondition(operands, operator === 'not_between');

            // String empty checks
            case 'is_empty':
            case 'is_not_empty': {
                const fieldName = this.extractFieldName(operands);
                const op = operator === 'is_empty' ? '=' : '!=';
                return `(${this.mapFieldName(fieldName)} IS ${op === '=' ? '' : 'NOT '}NULL OR ${this.mapFieldName(
                    fieldName,
                )} ${op} '')`;
            }

            default:
                throw new Error(`Unsupported JsonLogic operator: ${operator}`);
        }
    }

    protected buildComparisonCondition(sqlOp: string, operands: JsonLogicArgument): string {
        const [field, value] = this.extractFieldAndValue(operands);

        if (value === null) {
            return `${this.mapFieldName(field)} IS ${sqlOp === '=' ? 'NULL' : 'NOT NULL'}`;
        }

        const paramName = this.addParameter(value);
        return `${this.mapFieldName(field)} ${sqlOp} :${paramName}`;
    }

    protected buildLikeCondition(
        operands: JsonLogicArgument,
        startWildcard: boolean,
        endWildcard: boolean,
        not: boolean = false,
    ): string {
        const [field, value] = this.extractFieldAndValue(operands);

        if (typeof value !== 'string') {
            throw new Error('LIKE operator requires a string value');
        }

        let pattern = value;
        if (startWildcard) pattern = `%${pattern}`;
        if (endWildcard) pattern = `${pattern}%`;

        const paramName = this.addParameter(pattern);
        return `${this.mapFieldName(field)} ${not ? 'NOT ' : ''}LIKE :${paramName}`;
    }

    protected buildInCondition(operands: JsonLogicArgument, not: boolean): string {
        const [field, values] = this.extractFieldAndValue(operands);

        if (!isArray(values) || some(values, (v) => !this.isJsonLogicPrimitive(v))) {
            throw new Error('IN operator requires an array of primitive values');
        }

        if (isEmpty(values)) {
            return not ? '1 = 1' : '1 = 0';
        }

        const paramNames = map(values, (val) => `:${this.addParameter(val)}`);
        return `${this.mapFieldName(field)} ${not ? 'NOT ' : ''}IN (${paramNames.join(', ')})`;
    }

    protected buildBetweenCondition(operands: JsonLogicArgument, not: boolean): string {
        if (!isArray(operands) || operands.length !== 3) {
            throw new Error('BETWEEN operator requires 3 operands');
        }

        const [fieldArg, minVal, maxVal] = operands;
        const field = this.extractFieldName(fieldArg);

        if (!this.isJsonLogicPrimitive(minVal) || !this.isJsonLogicPrimitive(maxVal)) {
            throw new Error('BETWEEN requires primitive min/max values');
        }

        const minParam = this.addParameter(minVal);
        const maxParam = this.addParameter(maxVal);

        return `${this.mapFieldName(field)} ${not ? 'NOT ' : ''}BETWEEN :${minParam} AND :${maxParam}`;
    }

    // Helper methods
    protected extractFieldAndValue(operands: JsonLogicArgument): FieldValueTuple {
        if (!isArray(operands) || operands.length !== 2) {
            throw new Error('Invalid operands for comparison operator');
        }
        const [fieldArg, valueArg] = operands;
        const field = this.extractFieldName(fieldArg);
        const value = this.extractValue(valueArg);

        return [field, value];
    }

    protected extractFieldName(operand: JsonLogicArgument): string {
        if (isJsonLogicVarNode(operand)) {
            return operand.var;
        }
        if (isString(operand)) {
            return operand;
        }
        throw new Error('Invalid field operand: must be a string or a "var" node');
    }

    protected extractValue(operand: JsonLogicArgument): JsonLogicPrimitive | JsonLogicPrimitive[] {
        if (this.isJsonLogicPrimitive(operand)) {
            return operand;
        }
        if (isArray(operand) && every(operand, (op) => this.isJsonLogicPrimitive(op))) {
            return operand as JsonLogicPrimitive[];
        }
        throw new Error('Value must be a primitive or an array of primitives');
    }

    private isJsonLogicPrimitive(value: unknown): value is JsonLogicPrimitive {
        return isString(value) || isNumber(value) || isBoolean(value) || value === null;
    }

    /**
     * Map field name (can be overridden for custom field mapping)
     * @param field - Field name to map
     * @returns Mapped field name
     */
    protected mapFieldName(field: string): string {
        let mappedField = field;

        // Use aliasMap to replace entity name with its alias
        if (this.options.aliasMap && includes(mappedField, '.')) {
            const [entity, ...rest] = split(mappedField, '.');
            const alias = this.options.aliasMap.get(entity);
            if (alias) {
                mappedField = join([alias, ...rest], '.');
            }
        }

        if (this.options.fieldMapper) {
            return this.options.fieldMapper(mappedField);
        }

        // Universal quoting function
        const quoteField = (f: string) => {
            if (includes(f, '.')) {
                const parts = split(f, '.');
                return `${parts[0]}."${parts[1]}"`;
            }
            if (this.options.tableAlias) {
                return `${this.options.tableAlias}."${f}"`;
            }
            return `"${f}"`;
        };

        // Handle JSONB path notation (e.g., "metadata->profile->name")
        if (includes(mappedField, '->')) {
            const parts = split(mappedField, '->');
            const columnName = parts.shift();

            if (!columnName) {
                throw new Error('Invalid JSONB path: missing column name.');
            }

            const aliasedColumn = quoteField(columnName);

            if (parts.length > 0) {
                const pathSegments = map(parts.slice(0, -1), (p) => `'${p}'`);
                const lastSegment = `'${parts[parts.length - 1]}'`;

                let finalPath = aliasedColumn;
                if (pathSegments.length > 0) {
                    finalPath += `->${pathSegments.join('->')}`;
                }
                finalPath += `->>${lastSegment}`;
                return finalPath;
            }
        }

        return quoteField(mappedField);
    }

    /**
     * Add parameter and return parameter name
     * @param value - Parameter value
     * @returns Parameter name
     */
    public addParameter(value: JsonLogicPrimitive | JsonLogicPrimitive[]): string {
        const paramName = `param${this.paramCounter++}`;
        // The paramName is generated internally from a counter, so it's safe from injection.
        // eslint-disable-next-line security/detect-object-injection
        this.parameters[paramName] = value;
        return paramName;
    }

    /**
     * Gets the current count of parameters.
     * @returns The number of parameters.
     */
    getParamCount(): number {
        return this.paramCounter;
    }

    /**
     * Gets the parameters object.
     * @returns The parameters record.
     */
    getParameters(): Record<string, any> {
        return this.parameters;
    }

    /**
     * Sets the options for the builder.
     * @param options - The options to set.
     */
    setOptions(options: SqlBuildOptions): void {
        this.options = { ...this.options, ...options };
    }

    /**
     * Reset the builder state (useful for reusing the same instance)
     */
    reset(): void {
        this.paramCounter = 0;
        this.parameters = {};
    }
}

/**
 * Factory function for creating a SqlBuilder instance
 * @param options - Configuration options
 * @returns New JsonLogicToSqlBuilder instance
 */
export const createJsonLogicToSqlBuilder = (options?: SqlBuildOptions): JsonLogicToSqlBuilder =>
    new JsonLogicToSqlBuilder(options);

/**
 * Utility function for quick conversion
 * @param rule - JsonLogic rule to convert
 * @param options - Configuration options
 * @returns SQL build result
 */
export const convertJsonLogicToSql = (rule: JsonLogicRuleNode, options?: SqlBuildOptions): SqlBuildResult => {
    const builder = new JsonLogicToSqlBuilder(options);
    return builder.build(rule);
};
