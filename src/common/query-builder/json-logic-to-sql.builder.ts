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
    get,
    isNull,
    size,
    endsWith,
    filter,
} from 'lodash';

import { ALL_OPERATORS_MAP } from '../constants/operator.constants';
import { QueryBuilderException } from '../exceptions/query-builder.exception';

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
    isObject(arg) && !isJsonLogicVarNode(arg) && !isArray(arg) && size(arg) === 1;

type FieldValueTuple = [string, JsonLogicPrimitive | JsonLogicPrimitive[]];

// Allowed operators are now derived from our single source of truth, plus structural operators.
const ALLOWED_OPERATORS = new Set([
    'and',
    'or',
    'not',
    ...map(ALL_OPERATORS_MAP, (value) => value.op),
    'json_array_text_contains',
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
    jsonbFieldAliasMap?: Record<string, string>;
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
            throw new QueryBuilderException(`Unsupported JsonLogic operator: ${operator}`);
        }

        const operands = rule[operator as keyof typeof rule];

        switch (operator) {
            // Logical operators
            case 'and':
            case 'or': {
                if (!isArray(operands))
                    throw new QueryBuilderException('AND/OR operator requires an array of operands');
                const conditions = map(operands, (op) => {
                    if (!isJsonLogicRuleNode(op)) throw new QueryBuilderException('Invalid operand for AND/OR');
                    return this.buildCondition(op);
                });
                return `(${conditions.join(operator === 'and' ? ' AND ' : ' OR ')})`;
            }
            case 'not': {
                if (!isJsonLogicRuleNode(operands)) throw new QueryBuilderException('Invalid operand for NOT');
                return `NOT (${this.buildCondition(operands)})`;
            }

            // Comparison operators
            case '==':
                return this.buildComparisonCondition('=', operands);
            case '!=':
                return this.buildComparisonCondition('!=', operands);
            case '>':
                return this.buildComparisonCondition('>', operands);
            case '>=':
                return this.buildComparisonCondition('>=', operands);
            case '<':
                return this.buildComparisonCondition('<', operands);
            case '<=':
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

            // --- Custom JSONB Operators ---
            case 'json_equals':
                return this.buildJsonbQuery('equals', operands);
            case 'json_contains':
                return this.buildJsonbQuery('contains', operands);
            case 'json_in':
                return this.buildJsonbQuery('in', operands);

            // --- Custom Array Operators ---
            case 'array_overlaps':
                return this.buildArrayOverlapCondition(operands, false);

            case 'json_array_text_contains':
                return this.buildJsonArrayTextContainsCondition(operands);

            default:
                throw new QueryBuilderException(`Unsupported JsonLogic operator: ${operator}`);
        }
    }

    protected buildComparisonCondition(sqlOp: string, operands: JsonLogicArgument): string {
        const [field, value] = this.extractFieldAndValue(operands);

        if (isNull(value)) {
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

        if (!isString(value)) {
            throw new QueryBuilderException('LIKE operator requires a string value');
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
            throw new QueryBuilderException('IN operator requires an array of primitive values');
        }

        if (isEmpty(values)) {
            return not ? '1 = 1' : '1 = 0';
        }

        // Validate UUID format if the field appears to be an ID field
        if (includes(field, '.id') || endsWith(field, 'Id')) {
            const invalidUuids = this.validateUuidFormat(values, field);

            if (invalidUuids.length > 0) {
                throw new QueryBuilderException(
                    `Invalid UUID format(s) for field "${field}": ${invalidUuids.join(', ')}`,
                );
            }
        }

        const paramNames = map(values, (val) => `:${this.addParameter(val)}`);
        return `${this.mapFieldName(field)} ${not ? 'NOT ' : ''}IN (${paramNames.join(', ')})`;
    }

    protected buildBetweenCondition(operands: JsonLogicArgument, not: boolean): string {
        if (!isArray(operands) || size(operands) !== 3) {
            throw new QueryBuilderException('BETWEEN operator requires 3 operands');
        }

        const [fieldArg, minVal, maxVal] = operands;
        const field = this.extractFieldName(fieldArg);

        if (!this.isJsonLogicPrimitive(minVal) || !this.isJsonLogicPrimitive(maxVal)) {
            throw new QueryBuilderException('BETWEEN requires primitive min/max values');
        }

        const minParam = this.addParameter(minVal);
        const maxParam = this.addParameter(maxVal);

        return `${this.mapFieldName(field)} ${not ? 'NOT ' : ''}BETWEEN :${minParam} AND :${maxParam}`;
    }

    protected buildArrayOverlapCondition(operands: JsonLogicArgument, not: boolean = false): string {
        const [field, values] = this.extractFieldAndValue(operands);

        if (!isArray(values) || some(values, (v) => !this.isJsonLogicPrimitive(v))) {
            throw new QueryBuilderException('OVERLAPS operator requires an array of primitive values');
        }

        if (isEmpty(values)) {
            return not ? '1 = 1' : '1 = 0'; // Or handle as an error
        }

        // Validate UUID format for all values
        const invalidUuids = this.validateUuidFormat(values);

        if (invalidUuids.length > 0) {
            throw new QueryBuilderException(`Invalid UUID format(s): ${invalidUuids.join(', ')}`);
        }

        const paramName = this.addParameter(values);
        const mappedField = this.mapFieldName(field);

        // Assuming UUIDs for now, as this is the primary use case for category IDs.
        // A more robust solution might infer type or take it as an option.
        const condition = `${mappedField} && ARRAY[:${paramName}]::uuid[]`;

        return not ? `NOT (${condition})` : condition;
    }

    protected buildJsonArrayTextContainsCondition(operands: JsonLogicArgument): string {
        const [field, value] = this.extractFieldAndValue(operands);

        if (!isString(value)) {
            throw new QueryBuilderException('json_array_text_contains requires a string search value.');
        }

        if (!includes(field, '.')) {
            throw new QueryBuilderException(
                `Invalid field for JSON array query: ${field}. Must be in format 'column.key'.`,
            );
        }

        const [columnName, jsonKey] = split(field, '.');
        const mappedColumn = this.applyQuoting(columnName);
        const paramName = this.addParameter(`%${value}%`);

        return `EXISTS (SELECT 1 FROM jsonb_array_elements(${mappedColumn}) AS elem WHERE elem->>'${jsonKey}' ILIKE :${paramName})`;
    }

    protected buildJsonbQuery(operator: 'equals' | 'contains' | 'in', operands: JsonLogicArgument): string {
        if (!isArray(operands) || size(operands) !== 2) {
            throw new QueryBuilderException('Invalid operands for json operator');
        }

        const field = this.extractFieldName(operands[0]);
        const value = this.extractValue(operands[1]);

        if (!includes(field, '.')) {
            throw new QueryBuilderException(
                `Invalid field for JSONB query: ${field}. Must be in format 'column.path'.`,
            );
        }

        const [columnName, ...pathParts] = split(field, '.');
        const jsonFieldKey = join(pathParts, '.'); // e.g., "name" or "profile.firstName"

        if (columnName === '__proto__') {
            throw new QueryBuilderException('Invalid field specified for JSONB query.');
        }

        if (isEmpty(jsonFieldKey)) {
            throw new QueryBuilderException(`Invalid path for JSONB query: ${field}. Path is empty.`);
        }

        const alias = get(this.options.jsonbFieldAliasMap, columnName, this.options.tableAlias);
        if (!alias) {
            throw new QueryBuilderException(`Could not determine alias for JSONB column: ${columnName}`);
        }
        const sqlColumn = `${alias}."${columnName}"`;

        const recordAlias = 'item';
        // We assume the path is simple (not nested) for defining the record type, e.g., "name text".
        // For nested paths like "profile.name", this would need to be more complex.
        const recordDefinition = `${recordAlias}(${jsonFieldKey} text)`;

        let whereClause = '';

        if (operator === 'in') {
            if (!isArray(value) || isEmpty(value)) return '1 = 0';
            const paramName = this.addParameter(value);
            whereClause = `${recordAlias}.${jsonFieldKey} IN (:${paramName})`;
        } else if (operator === 'equals') {
            const paramName = this.addParameter(value);
            whereClause = `${recordAlias}.${jsonFieldKey} = :${paramName}`;
        } else if (operator === 'contains') {
            if (!isString(value) && !isNumber(value)) {
                throw new QueryBuilderException('The "json_contains" operator requires a string or number value.');
            }
            const paramName = this.addParameter(`%${value}%`);
            whereClause = `${recordAlias}.${jsonFieldKey} ILIKE :${paramName}`;
        }

        return `EXISTS (SELECT 1 FROM jsonb_to_recordset(${sqlColumn}) AS ${recordDefinition} WHERE ${whereClause})`;
    }

    // Helper methods
    protected extractFieldAndValue(operands: JsonLogicArgument): FieldValueTuple {
        if (!isArray(operands) || size(operands) !== 2) {
            throw new QueryBuilderException('Invalid operands for comparison operator');
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
        throw new QueryBuilderException('Invalid field operand: must be a string or a "var" node');
    }

    protected extractValue(operand: JsonLogicArgument): JsonLogicPrimitive | JsonLogicPrimitive[] {
        if (this.isJsonLogicPrimitive(operand)) {
            return operand;
        }
        if (isArray(operand) && every(operand, (op) => this.isJsonLogicPrimitive(op))) {
            return operand as JsonLogicPrimitive[];
        }
        throw new QueryBuilderException('Value must be a primitive or an array of primitives');
    }

    private isJsonLogicPrimitive(value: unknown): value is JsonLogicPrimitive {
        return isString(value) || isNumber(value) || isBoolean(value) || isNull(value);
    }

    private validateUuidFormat(values: any[], _fieldName?: string): string[] {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return filter(values, (value) => !uuidRegex.test(String(value))) as string[];
    }

    /**
     * Map field name (can be overridden for custom field mapping)
     * @param field - Field name to map
     * @returns Mapped field name
     */
    protected mapFieldName(field: string): string {
        // Try the custom field mapper first. If it returns a valid mapping, use it immediately.
        if (this.options.fieldMapper) {
            const customMappedField = this.options.fieldMapper(field);
            if (customMappedField) {
                return customMappedField;
            }
        }

        // If the mapper didn't handle the field, proceed with the default logic.
        let mappedField = field;

        // Use aliasMap to replace entity name with its alias
        if (this.options.aliasMap && includes(mappedField, '.')) {
            const [entity, ...rest] = split(mappedField, '.');
            const alias = this.options.aliasMap.get(entity);
            if (alias) {
                mappedField = join([alias, ...rest], '.');
            }
        }

        // If field doesn't have a table prefix and we have a tableAlias, add it
        if (!includes(mappedField, '.') && this.options.tableAlias) {
            mappedField = `${this.options.tableAlias}.${mappedField}`;
        }

        // Handle JSONB path notation (e.g., "metadata->profile->name")
        if (includes(mappedField, '->')) {
            return this.handleJsonbPath(mappedField);
        }

        // Apply quoting to the final mapped field
        return this.applyQuoting(mappedField);
    }

    private handleJsonbPath(mappedField: string): string {
        const parts = split(mappedField, '->');
        const columnName = parts.shift();

        if (!columnName) {
            throw new QueryBuilderException('Invalid JSONB path: missing column name.');
        }

        // Apply quoting to the column name
        const aliasedColumn = includes(columnName, '.')
            ? `${split(columnName, '.')[0]}."${split(columnName, '.')[1]}"`
            : `"${columnName}"`;

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
        return aliasedColumn;
    }

    private applyQuoting(mappedField: string): string {
        // Check if field already has quotes to avoid double quoting
        if (includes(mappedField, '"')) {
            return mappedField;
        }

        // Apply quoting to the final mapped field
        if (includes(mappedField, '.')) {
            const parts = split(mappedField, '.');
            return `${parts[0]}."${parts[1]}"`;
        }

        return `"${mappedField}"`;
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
