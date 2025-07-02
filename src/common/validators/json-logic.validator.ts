import {
    difference,
    first,
    forEach,
    get,
    includes,
    isArray,
    isNumber,
    isObject,
    isPlainObject,
    isString,
    keys,
    map,
    size,
} from 'lodash';

import {
    ALL_OPERATORS_MAP,
    LOGIC_OPERATORS,
    LOGIC_TO_FRIENDLY_MAP,
    NUMBER_OPERATORS,
    STRING_OPERATORS,
} from '../constants/operator.constants';
import { FieldSettings, UiFieldDefinition } from '../query-builder/query-blueprint.base';

// A subset of json-logic-js types for validation purposes
// This can be expanded as needed.
export type JsonLogicRule = boolean | string | number | { [operator: string]: any };

export interface QueryConfig {
    name: string;
    fields: Record<string, UiFieldDefinition>;
    sortableFields: string[];
    selectableFields: string[];
    defaultSort?: { field: string; direction: 1 | -1 }[];
}

// Types for validation requests
export interface SortRequest {
    field: string;
    direction: 'ASC' | 'DESC';
}

export interface SelectFieldsRequest {
    fields: string[];
}

export interface CompleteQueryRequest {
    filter?: JsonLogicRule;
    order?: { field: string; direction: 1 | -1 }[];
    select?: string[];
}

/**
 * A stateless validator for JSON Logic queries based on a blueprint.
 * All validation methods are static and require the blueprint to be passed in.
 */
export class JsonLogicValidator {
    /**
     * Validates an entire query object in a single call.
     * @param blueprint The query blueprint configuration.
     * @param query The complete query object from the client.
     */
    public static validateCompleteQuery(blueprint: QueryConfig, query: CompleteQueryRequest): void {
        if (query.filter) {
            this.validate(blueprint, query.filter);
        }

        if (query.order) {
            const sortableFields = new Set(blueprint.sortableFields || []);
            for (const sortItem of query.order) {
                if (!sortableFields.has(sortItem.field)) {
                    throw new Error(`Field "${sortItem.field}" is not sortable.`);
                }
            }
        }

        if (query.select) {
            const selectableFields = new Set(blueprint.selectableFields || []);
            for (const field of query.select) {
                if (!selectableFields.has(field)) {
                    throw new Error(`Field "${field}" is not selectable.`);
                }
            }
        }
    }

    /**
     * Validates the entire json-logic rule.
     * @param blueprint The query blueprint configuration.
     * @param rule The json-logic rule to validate.
     */
    public static validate(blueprint: QueryConfig, rule: JsonLogicRule): void {
        if (!isObject(rule) || isArray(rule)) {
            throw new Error('Rule must be a non-array object.');
        }

        const queryableFields = this.getQueryableFields(blueprint);
        this.validateNode(rule, queryableFields);
    }

    private static getQueryableFields(blueprint: QueryConfig): Map<string, UiFieldDefinition> {
        if (!blueprint || !blueprint.fields) {
            throw new Error('Invalid blueprint configuration provided.');
        }

        const mappedFieldEntries = map(
            blueprint.fields,
            (config: UiFieldDefinition, fieldName: string): [string, UiFieldDefinition] => {
                const mappedOperators = map(config.operators, (op: string) => {
                    const operatorInfo = get(ALL_OPERATORS_MAP, op);
                    if (!operatorInfo) {
                        throw new Error(`Operator "${op}" in blueprint is not defined in ALL_OPERATORS_MAP.`);
                    }
                    return operatorInfo.op;
                });
                return [fieldName, { ...config, operators: mappedOperators }];
            },
        );
        return new Map(mappedFieldEntries);
    }

    private static validateNode(node: unknown, queryableFields: Map<string, UiFieldDefinition>): void {
        if (!isPlainObject(node)) {
            return;
        }

        const nodeKeys = keys(node);
        if (nodeKeys.length !== 1) {
            throw new Error(`Invalid logic node: must have exactly one key, but found: ${nodeKeys.join(', ')}`);
        }

        const [operator] = nodeKeys;
        const values = get(node, operator) as unknown;

        if (operator === LOGIC_OPERATORS.VAR) {
            this.validateVarNode(values, queryableFields);
            return;
        }

        if (!isArray(values)) {
            throw new Error(`Arguments for operator "${operator}" must be in an array.`);
        }

        forEach(values, (arg) => this.validateNode(arg, queryableFields));

        const standardLogicOperators = [
            LOGIC_OPERATORS.AND,
            LOGIC_OPERATORS.OR,
            LOGIC_OPERATORS.IF,
            LOGIC_OPERATORS.TERNARY,
        ];
        if (!includes(standardLogicOperators, operator)) {
            this.checkFieldSpecificOperator(operator, values, queryableFields);
        }
    }

    private static validateVarNode(varValue: unknown, queryableFields: Map<string, UiFieldDefinition>): void {
        const fieldName: unknown = isArray(varValue) ? first(varValue) : varValue;

        if (!isString(fieldName)) {
            throw new Error("'var' path must be a string.");
        }

        if (!queryableFields.has(fieldName)) {
            throw new Error(`Field "${fieldName}" is not queryable.`);
        }
    }

    private static checkFieldSpecificOperator(
        operator: string,
        values: any[],
        queryableFields: Map<string, UiFieldDefinition>,
    ): void {
        const allAllowedOperators = new Set(Array.from(queryableFields.values()).flatMap((config) => config.operators));
        if (!allAllowedOperators.has(operator)) {
            throw new Error(`Operator "${operator}" is not allowed by this blueprint.`);
        }

        this.validateOperatorArguments(operator, values);

        const referencedFieldNames = this.findVarsInArgs(values);
        if (referencedFieldNames.length === 0) {
            throw new Error(`Operator "${operator}" must operate on at least one queryable field.`);
        }

        for (const fieldName of referencedFieldNames) {
            const fieldConfig = queryableFields.get(fieldName);
            if (!includes(fieldConfig?.operators, operator)) {
                throw new Error(`Operator "${operator}" is not allowed for field "${fieldName}".`);
            }
            this.validateOperatorValues(operator, values, fieldName, fieldConfig);
        }
    }

    private static validateOperatorArguments(operator: string, values: any[]): void {
        const friendlyName = get(LOGIC_TO_FRIENDLY_MAP, operator);
        if (!friendlyName) {
            // This case should ideally not be reached if the operator was validated against the blueprint
            return;
        }

        const operatorInfo = get(ALL_OPERATORS_MAP, friendlyName);
        if (operatorInfo && operatorInfo.arity !== undefined) {
            const requiredCount = operatorInfo.arity;
            const actualCount = values.length;

            if (isArray(requiredCount)) {
                if (!includes(requiredCount, actualCount)) {
                    throw new Error(
                        `Operator "${operator}" requires ${requiredCount.join(
                            ' or ',
                        )} arguments, but got ${actualCount}.`,
                    );
                }
            } else if (actualCount !== requiredCount) {
                throw new Error(
                    `Operator "${operator}" requires exactly ${requiredCount} arguments, but got ${actualCount}.`,
                );
            }
        }
    }

    private static validateListValues(
        friendlyName: string,
        fieldConfig: UiFieldDefinition,
        values: any[],
        fieldName: string,
    ): void {
        if (
            (friendlyName === STRING_OPERATORS.IN || friendlyName === STRING_OPERATORS.NOT_IN) &&
            fieldConfig.fieldSettings?.listValues &&
            fieldConfig.fieldSettings.listValues.length > 0
        ) {
            const { listValues, listValuesType, valueKey } = fieldConfig.fieldSettings;
            let allowedValues: any[];

            if (listValuesType === 'object') {
                if (!valueKey) {
                    throw new Error(
                        `Configuration error for field "${fieldName}": listValuesType is 'object' but 'valueKey' is not defined.`,
                    );
                }
                allowedValues = map(listValues, valueKey);
            } else {
                allowedValues = listValues;
            }

            const providedValues = get(values, 1) as unknown[];
            if (isArray(providedValues)) {
                const invalidValues = difference(providedValues, allowedValues);
                if (size(invalidValues) > 0) {
                    throw new Error(
                        `Value(s) "${invalidValues.join(
                            ', ',
                        )}" are not allowed for field "${fieldName}". Permitted values are: ${allowedValues.join(
                            ', ',
                        )}.`,
                    );
                }
            }
        }
    }

    private static validateBetweenOperator(friendlyName: string, values: any[], operator: string): void {
        if (friendlyName === NUMBER_OPERATORS.BETWEEN || friendlyName === NUMBER_OPERATORS.NOT_BETWEEN) {
            const minValue = get(values, 1) as unknown;
            const maxValue = get(values, 2) as unknown;

            if (isNumber(minValue) && isNumber(maxValue) && minValue > maxValue) {
                throw new Error(
                    `Range operator "${operator}" requires min value (${minValue}) to be less than or equal to max value (${maxValue}).`,
                );
            }
        }
    }

    private static extractLiteralValues(args: any[]): any[] {
        const literalValues: any[] = [];
        const finder = (current: any) => {
            if (isPlainObject(current)) return;
            if (isArray(current)) {
                forEach(current, finder);
            } else {
                literalValues.push(current);
            }
        };
        forEach(args, finder);
        return literalValues;
    }

    private static checkNumberRules(value: number, fieldName: string, settings: FieldSettings): void {
        if (settings.min !== undefined && value < settings.min) {
            throw new Error(
                `Field "${fieldName}" value ${value} is less than the minimum allowed value of ${settings.min}.`,
            );
        }
        if (settings.max !== undefined && value > settings.max) {
            throw new Error(
                `Field "${fieldName}" value ${value} is greater than the maximum allowed value of ${settings.max}.`,
            );
        }
    }

    private static checkStringRules(value: string, fieldName: string, settings: FieldSettings): void {
        if (settings.regex) {
            try {
                // eslint-disable-next-line security/detect-non-literal-regexp
                const regex = new RegExp(settings.regex);
                if (!regex.test(value)) {
                    throw new Error(
                        `Field "${fieldName}" value "${value}" does not match the required pattern: ${settings.regex}.`,
                    );
                }
            } catch {
                throw new Error(`Invalid regex pattern in blueprint for field "${fieldName}": ${settings.regex}.`);
            }
        }
    }

    private static validateValueConstraints(fieldConfig: UiFieldDefinition, values: any[], fieldName: string): void {
        const settings = fieldConfig.fieldSettings;
        if (!settings || (settings.min === undefined && settings.max === undefined && !settings.regex)) {
            return;
        }

        const literalValues = this.extractLiteralValues(values);

        forEach(literalValues, (value) => {
            if (isNumber(value)) {
                this.checkNumberRules(value, fieldName, settings);
            }
            if (isString(value)) {
                this.checkStringRules(value, fieldName, settings);
            }
        });
    }

    private static validateOperatorValues(
        operator: string,
        values: any[],
        fieldName: string,
        fieldConfig?: UiFieldDefinition,
    ): void {
        if (!fieldConfig) return;

        const friendlyName = get(LOGIC_TO_FRIENDLY_MAP, operator);
        if (!friendlyName) return;

        this.validateListValues(friendlyName, fieldConfig, values, fieldName);
        this.validateBetweenOperator(friendlyName, values, operator);
        this.validateValueConstraints(fieldConfig, values, fieldName);
    }

    private static findVarsInArgs(args: any[]): string[] {
        const fieldNames = new Set<string>();
        const finder = (current: unknown) => {
            if (isPlainObject(current) && !isArray(current)) {
                const [operator] = keys(current);
                const values = get(current, operator) as unknown;
                if (operator === LOGIC_OPERATORS.VAR) {
                    const fieldName: unknown = isArray(values) ? first(values) : values;
                    if (isString(fieldName)) {
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
