/* eslint-disable prefer-destructuring */
import {
    isArray,
    compact,
    replace,
    trim,
    join,
    isEmpty,
    map,
    includes,
    split,
    set,
    get,
    toLower,
    assign,
    some,
} from 'lodash';

import { SqlBuildOptions, JsonLogicRuleNode, JsonLogicToSqlBuilder } from './json-logic-to-sql.builder';
import { convertCase, deepConvertCase } from '../utils/case-converter.utils';

type CaseConversionType = 'snake';

export interface CTEDefinition {
    name: string;
    query: string;
    parameters?: Record<string, any>;
    recursive?: boolean;
}

export interface QueryBuilderOptions {
    useCTE?: boolean;
    cteDefinitions?: CTEDefinition[];
    fieldMap?: Record<string, string>;
}

/**
 * Simple utility to build SQL queries with WHERE filters
 */
export class QueryBuilder {
    private fields: string | string[] = '*';
    private fromTable: string = '';
    private joins: string[] = [];
    private aliasMap: Map<string, string> = new Map();
    private mainTableAlias: string | null = null;
    private whereConditions: string[] = [];
    private orderByClause: string = '';
    private limitClause: string = '';
    private offsetClause: string = '';
    private parameters: Record<string, any> = {};
    private paramCounter = 0;
    private caseConversion: CaseConversionType | null = null;
    private cteDefinitions: CTEDefinition[] = [];
    private options: QueryBuilderOptions = {};
    private fieldMap: Record<string, string> = {};

    constructor(options: QueryBuilderOptions = {}) {
        this.options = options;
        if (options.cteDefinitions) {
            this.cteDefinitions = [...options.cteDefinitions];
        }
        if (options.fieldMap) {
            this.fieldMap = options.fieldMap;
        }
    }

    setCaseConversion(type: CaseConversionType): QueryBuilder {
        this.caseConversion = type;
        return this;
    }

    select(fields: string | string[] = '*'): QueryBuilder {
        if (!isArray(fields) || isEmpty(fields)) {
            if (fields === '*' && this.mainTableAlias) {
                this.fields = `${this.mainTableAlias}.*`;
            } else {
                this.fields = fields;
            }
            return this;
        }

        this.fields = map(fields, (field) => {
            // Check if the field is a key in the fieldMap
            if (get(this.fieldMap, field)) {
                return get(this.fieldMap, field);
            }

            if (includes(field, '(') || includes(field, '*')) {
                return field; // Let raw SQL expressions pass through
            }

            // Separate field from its alias, e.g., 'roles.name' and 'AS roleName'
            const [fieldPart, ...aliasArr] = split(field, /\s+AS\s+/i);
            const aliasClause = aliasArr.length > 0 ? ` AS ${aliasArr.join(' AS ')}` : '';

            let finalField = fieldPart;

            // 1. Replace table name with alias from aliasMap
            for (const [tableName, alias] of this.aliasMap.entries()) {
                // eslint-disable-next-line security/detect-non-literal-regexp
                const regex = new RegExp(`^${tableName}\\.`);
                finalField = replace(finalField, regex, `${alias}.`);
            }

            // 2. Apply case conversion
            let dbField = finalField;
            if (this.caseConversion) {
                if (includes(finalField, '.')) {
                    const [tableAlias, columnName] = split(finalField, '.');
                    dbField = `${tableAlias}.${convertCase(columnName, this.caseConversion)}`;
                } else {
                    dbField = convertCase(finalField, this.caseConversion);
                }
            }

            // 3. Prepend main table alias if there's no dot notation
            if (this.mainTableAlias && !includes(dbField, '.')) {
                dbField = `${this.mainTableAlias}.${dbField}`;
            }

            // 4. Determine final alias. If an alias was given, use it.
            // Otherwise, if we converted case, create an alias back to the original camelCase name.
            let finalAlias = aliasClause;
            if (!finalAlias && this.caseConversion && toLower(dbField) !== toLower(fieldPart)) {
                const originalColumnName = includes(fieldPart, '.') ? split(fieldPart, '.')[1] : fieldPart;
                finalAlias = ` AS "${originalColumnName}"`;
            }

            return `${this.quoteField(dbField)}${finalAlias}`;
        });

        return this;
    }

    from(tableName: string, alias?: string): QueryBuilder {
        this.fromTable = alias ? `${tableName} AS ${alias}` : tableName;
        if (alias) {
            this.mainTableAlias = alias;
            this.aliasMap.set(tableName, alias);
        }
        return this;
    }

    join(type: 'INNER' | 'LEFT' | 'RIGHT', table: string, on: string): QueryBuilder {
        this.joins.push(`${type} JOIN ${table} ON ${on}`);
        const match = table.match(/(\S+)\s+AS\s+(\S+)/i);
        if (match) {
            const tableName = match[1];
            const tableAlias = match[2];
            this.aliasMap.set(tableName, tableAlias);
        }
        return this;
    }

    where(
        rule: JsonLogicRuleNode,
        options: Omit<SqlBuildOptions, 'wrapInParentheses' | 'aliasMap'> = {},
    ): QueryBuilder {
        if (!rule || isEmpty(rule)) {
            return this;
        }
        if (isEmpty(this.whereConditions)) {
            this.parameters = {};
            this.paramCounter = 0;
        }

        const builderOptions: SqlBuildOptions = {
            ...options,
            aliasMap: this.aliasMap,
            tableAlias: this.mainTableAlias || undefined,
        };

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const convertedRule = this.caseConversion ? deepConvertCase(rule, this.caseConversion) : rule;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        this.addCondition(convertedRule, builderOptions);
        return this;
    }

    andWhere(
        rule: JsonLogicRuleNode,
        options: Omit<SqlBuildOptions, 'wrapInParentheses' | 'aliasMap'> = {},
    ): QueryBuilder {
        if (!rule || isEmpty(rule)) {
            return this;
        }

        const builderOptions: SqlBuildOptions = {
            ...options,
            aliasMap: this.aliasMap,
            tableAlias: this.mainTableAlias || undefined,
        };

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const convertedRule = this.caseConversion ? deepConvertCase(rule, this.caseConversion) : rule;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        this.addCondition(convertedRule, builderOptions);
        return this;
    }

    private addCondition(rule: JsonLogicRuleNode, options: SqlBuildOptions) {
        const tempBuilder = new JsonLogicToSqlBuilder(options);
        const result = tempBuilder.build(rule);

        let conditionSql = result.sql;

        for (const key in result.parameters) {
            const newKey = `param${this.paramCounter++}`;
            // eslint-disable-next-line security/detect-non-literal-regexp
            const searchRegex = new RegExp(`(?<!:param\\d*):${key}(?!\\d)`, 'g');
            conditionSql = replace(conditionSql, searchRegex, `:${newKey}`);
            set(this.parameters, newKey, get(result, `parameters.${key}`));
        }

        this.whereConditions.push(conditionSql);
    }

    getWhereClause(): string {
        if (this.whereConditions.length === 0) {
            return '';
        }
        return `WHERE ${this.whereConditions.join(' AND ')}`;
    }

    setWhereClause(clause: string): QueryBuilder {
        this.whereConditions = [clause];
        return this;
    }

    orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
        let convertedField = this.caseConversion ? convertCase(field, this.caseConversion) : field;
        if (this.mainTableAlias && !includes(convertedField, '.')) {
            convertedField = `${this.mainTableAlias}.${convertedField}`;
        }
        const newOrderBy = `${this.quoteField(convertedField)} ${direction}`;

        if (this.orderByClause) {
            this.orderByClause += `, ${newOrderBy}`;
        } else {
            this.orderByClause = `ORDER BY ${newOrderBy}`;
        }
        return this;
    }

    orderByArray(order: Array<{ field: string; direction: 1 | -1 }>): QueryBuilder {
        if (!order || isEmpty(order)) {
            return this;
        }
        const orderClauses = map(order, (o) => {
            const direction = o.direction === 1 ? 'ASC' : 'DESC';
            let finalField = o.field;
            for (const [tableName, alias] of this.aliasMap.entries()) {
                // eslint-disable-next-line security/detect-non-literal-regexp
                const regex = new RegExp(`^${tableName}\\.`);
                finalField = replace(finalField, regex, `${alias}.`);
            }

            if (this.caseConversion) {
                if (includes(finalField, '.')) {
                    const [tableAlias, columnName] = split(finalField, '.');
                    finalField = `${tableAlias}.${convertCase(columnName, this.caseConversion)}`;
                } else {
                    finalField = convertCase(finalField, this.caseConversion);
                }
            }
            if (this.mainTableAlias && !includes(finalField, '.')) {
                finalField = `${this.mainTableAlias}.${finalField}`;
            }
            return `${this.quoteField(finalField)} ${direction}`;
        });

        this.orderByClause = `ORDER BY ${join(orderClauses, ', ')}`;
        return this;
    }

    limit(limit: number): QueryBuilder {
        this.limitClause = `LIMIT ${limit}`;
        return this;
    }

    offset(offset: number): QueryBuilder {
        this.offsetClause = `OFFSET ${offset}`;
        return this;
    }

    build(): { sql: string; parameters: Record<string, any> } {
        const whereClause = this.getWhereClause();
        if (!this.fromTable && isEmpty(this.joins) && whereClause) {
            return {
                sql: whereClause,
                parameters: this.parameters,
            };
        }

        const parts: string[] = [];

        // Build CTE clause if we have CTEs
        if (this.cteDefinitions.length > 0) {
            const hasRecursive = some(this.cteDefinitions, (cte) => cte.recursive);
            const cteKeyword = hasRecursive ? 'WITH RECURSIVE' : 'WITH';

            const cteQueries = map(this.cteDefinitions, (cte) => `${cte.name} AS (${cte.query})`);
            parts.push(`${cteKeyword} ${cteQueries.join(', ')}`);
        }

        const selectFields = isArray(this.fields) ? join(this.fields, ', ') : this.fields;

        const selectClause = `SELECT ${selectFields}`;
        const fromClause = `FROM ${this.fromTable}`;
        const joinClause = join(this.joins, ' ');

        const sql = compact([
            ...parts,
            selectClause,
            fromClause,
            joinClause,
            whereClause,
            this.orderByClause,
            this.limitClause,
            this.offsetClause,
        ]).join(' ');

        return {
            sql: trim(replace(sql, /\s+/g, ' ')),
            parameters: this.parameters,
        };
    }

    reset(): QueryBuilder {
        this.fields = '*';
        this.fromTable = '';
        this.joins = [];
        this.aliasMap.clear();
        this.mainTableAlias = null;
        this.whereConditions = [];
        this.orderByClause = '';
        this.limitClause = '';
        this.offsetClause = '';
        this.parameters = {};
        this.paramCounter = 0;
        this.caseConversion = null;
        this.cteDefinitions = [];
        return this;
    }

    private quoteField(field: string): string {
        if (includes(field, '*') || includes(field, '(') || / AS /i.test(field)) {
            return field;
        }

        // Check if field already has quotes to avoid double quoting
        if (includes(field, '"')) {
            return field;
        }

        if (includes(field, '.')) {
            const parts = split(field, '.');
            return `${parts[0]}."${parts[1]}"`;
        }
        return `"${field}"`;
    }

    // CTE Methods
    addCTE(cte: CTEDefinition): this {
        this.cteDefinitions.push(cte);
        if (cte.parameters) {
            assign(this.parameters, cte.parameters);
        }
        return this;
    }

    addRecursiveCTE(name: string, baseQuery: string, recursiveQuery: string, parameters?: Record<string, any>): this {
        const fullQuery = `${baseQuery} UNION ALL ${recursiveQuery}`;
        return this.addCTE({
            name,
            query: fullQuery,
            parameters,
            recursive: true,
        });
    }
}

export const buildQuery = (
    tableName: string,
    whereRule: JsonLogicRuleNode,
    options: {
        select?: string[];
        orderBy?: string;
        orderDirection?: 'ASC' | 'DESC';
        limit?: number;
        offset?: number;
    } = {},
): { sql: string; parameters: Record<string, any> } => {
    const builder = new QueryBuilder();

    builder.select(options.select).from(tableName);
    builder.where(whereRule);

    if (options.orderBy) {
        builder.orderBy(options.orderBy, options.orderDirection);
    }

    if (options.limit) {
        builder.limit(options.limit);
        if (options.offset) {
            builder.offset(options.offset);
        }
    }

    return builder.build();
};
