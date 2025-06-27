import {
    difference,
    first,
    forEach,
    get,
    has,
    includes,
    isArray,
    isObject,
    isPlainObject,
    keys,
    map,
    size,
} from 'lodash';

import { OPERATOR_FRIENDLY_TO_JSON_LOGIC } from '../constants/operator.constants';

// A subset of json-logic-js types for validation purposes
// This can be expanded as needed.
export type JsonLogicRule = boolean | string | number | { [operator: string]: any };

export interface QueryFieldConfig {
    type: string;
    label: string;
    operators: string[];
    listValues?: { label: string; value: any }[];
    remoteValues?: {
        blueprint: string;
        valueField: string;
        labelField: string;
    };
    defaultValue?: any;
}

export interface QueryConfig {
    name: string;
    fields: Record<string, QueryFieldConfig>;
    sortableFields: string[];
    selectableFields: string[];
}

/**
 * Validates a json-logic rule against a query blueprint configuration.
 * This ensures that clients can only construct queries using the fields
 * and operators explicitly allowed by the backend.
 *
 * @example
 * const blueprint = JSON.parse(fs.readFileSync('FONT_MANAGEMENT.json', 'utf8'));
 * const validator = new JsonLogicValidator(blueprint);
 *
 * const validRule = { '==': [{ var: 'isActive' }, true] };
 * validator.validate(validRule); // returns true
 *
 * const invalidRule = { '==': [{ var: 'some_secret_field' }, true] };
 * validator.validate(invalidRule); // throws an error
 */
export class JsonLogicValidator {
    private readonly queryableFields: Map<string, QueryFieldConfig>;
    private readonly allAllowedOperators: Set<string>;

    constructor(private readonly blueprint: QueryConfig) {
        if (!blueprint || !blueprint.fields) {
            throw new Error('Invalid blueprint configuration provided.');
        }

        const mappedFieldEntries: [string, QueryFieldConfig][] = map(
            blueprint.fields,
            (config: QueryFieldConfig, fieldName: string): [string, QueryFieldConfig] => {
                const mappedOperators = map(config.operators, (op: string) =>
                    has(OPERATOR_FRIENDLY_TO_JSON_LOGIC, op) ? get(OPERATOR_FRIENDLY_TO_JSON_LOGIC, op) : op,
                );
                return [fieldName, { ...config, operators: mappedOperators }];
            },
        );

        this.queryableFields = new Map(mappedFieldEntries);

        this.allAllowedOperators = new Set(mappedFieldEntries.flatMap(([, config]) => config.operators));
    }

    /**
     * Validates the entire json-logic rule.
     * Throws an error if the rule is invalid.
     * @param rule The json-logic rule to validate.
     */
    public validate(rule: JsonLogicRule): void {
        if (!isObject(rule) || isArray(rule)) {
            throw new Error('Rule must be a non-array object.');
        }
        this.validateNode(rule);
    }

    /**
     * Recursively validates a node within the json-logic rule tree.
     * This method can be overridden by subclasses to extend validation logic.
     * @param node The node to validate.
     * @protected
     */
    protected validateNode(node: any): void {
        // Literals (strings, numbers, booleans, arrays) are valid leaves in the tree.
        if (!isPlainObject(node)) {
            return;
        }

        const nodeKeys = keys(node);
        if (nodeKeys.length !== 1) {
            throw new Error(`Invalid logic node: must have exactly one key, but found: ${nodeKeys.join(', ')}`);
        }

        const [operator] = nodeKeys;
        const values = get(node, operator) as unknown;

        if (operator === 'var') {
            this.validateVarNode(values);
            return;
        }

        // It's a logic operator ('and', 'or') or a data operator ('==', 'in', etc.)
        this.validateOperator(operator, values);
    }

    /**
     * Validates an operator and its arguments.
     * @param operator The operator key (e.g., '==', 'and', 'in').
     * @param values The arguments for the operator.
     * @private
     */
    private validateOperator(operator: string, values: any): void {
        const standardLogicOperators = ['and', 'or', 'if', '?:'];

        if (!isArray(values)) {
            throw new Error(`Arguments for operator "${operator}" must be in an array.`);
        }

        // Recursively validate all arguments of the operator FIRST.
        forEach(values, (arg) => this.validateNode(arg));

        // Then, check the operator itself.
        if (!includes(standardLogicOperators, operator)) {
            this.checkFieldSpecificOperator(operator, values);
        }
    }

    /**
     * Validates that a `var` node refers to a queryable field.
     * @param varValue The value associated with the 'var' key.
     * @private
     */
    private validateVarNode(varValue: any): void {
        // The `var` operator can have a default value: `{"var": ["path", "default"]}`
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const fieldName: string = isArray(varValue) ? first(varValue) : varValue;

        if (typeof fieldName !== 'string') {
            throw new Error("'var' path must be a string.");
        }

        if (!this.queryableFields.has(fieldName)) {
            throw new Error(`Field "${fieldName}" is not queryable.`);
        }
    }

    /**
     * Checks if a specific data operator (e.g., 'contains', '>') is permitted
     * for the field(s) it operates on.
     * @param operator The operator being used.
     * @param values The arguments passed to the operator.
     * @private
     */
    private checkFieldSpecificOperator(operator: string, values: any[]): void {
        // First, ensure the operator is allowed in the blueprint at all.
        if (!this.allAllowedOperators.has(operator)) {
            throw new Error(`Operator "${operator}" is not allowed by this blueprint.`);
        }

        // Find all variables ('var' nodes) within the arguments.
        const referencedFieldNames = this.findVarsInArgs(values);

        if (referencedFieldNames.length === 0) {
            // This could be a rule like `{"==": [1, 1]}`. While odd, it's valid json-logic.
            // No fields to validate against, so we can exit.
            return;
        }

        // For each referenced field, ensure it allows the operator.
        for (const fieldName of referencedFieldNames) {
            const fieldConfig = this.queryableFields.get(fieldName);
            if (!includes(fieldConfig?.operators, operator)) {
                throw new Error(`Operator "${operator}" is not allowed for field "${fieldName}".`);
            }

            // Special check for 'in' operator values against the field's `listValues`
            if (operator === 'in' && fieldConfig?.listValues) {
                const providedValues = get(values, 1) as unknown[]; // The array is the second argument in an "in" clause
                if (isArray(providedValues)) {
                    const allowedValues = map(fieldConfig.listValues, 'value');
                    const invalidValues = difference(providedValues, allowedValues);

                    if (size(invalidValues) > 0) {
                        throw new Error(
                            `Value(s) "${invalidValues.join(', ')}" are not allowed for field "${fieldName}". Permitted values are: ${allowedValues.join(', ')}.`,
                        );
                    }
                }
            }
        }
    }

    /**
     * A helper to find all field names referenced by 'var' nodes in an array of arguments.
     * @param args An array of arguments for an operator.
     * @returns An array of unique field names.
     */
    private findVarsInArgs(args: any[]): string[] {
        const fieldNames = new Set<string>();

        const finder = (current: any) => {
            if (isPlainObject(current) && !isArray(current)) {
                const [operator] = keys(current);
                const values = get(current, operator) as unknown;
                if (operator === 'var') {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                    const fieldName = isArray(values) ? first(values) : values;

                    if (typeof fieldName === 'string') {
                        fieldNames.add(fieldName);
                    }
                } else if (isArray(values)) {
                    forEach(values, finder);
                }
            }
        };

        forEach(args, finder);
        return Array.from(fieldNames);
    }
}
