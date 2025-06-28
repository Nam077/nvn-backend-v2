import { isArray, compact, replace, trim, join, isEmpty } from 'lodash';

import { convertJsonLogicToSql, SqlBuildOptions, JsonLogicRuleNode } from './json-logic-to-sql.builder';

/**
 * Simple utility to build SQL queries with WHERE filters
 */
export class QueryBuilder {
    private fields: string | string[] = '*';
    private fromTable: string = '';
    private joins: string[] = [];
    private whereClause: string = '';
    private orderByClause: string = '';
    private limitClause: string = '';
    private offsetClause: string = '';
    private parameters: Record<string, any> = {};

    select(fields: string | string[] = '*'): QueryBuilder {
        this.fields = fields;
        return this;
    }

    from(tableName: string, alias?: string): QueryBuilder {
        this.fromTable = alias ? `${tableName} AS ${alias}` : tableName;
        return this;
    }

    join(type: 'INNER' | 'LEFT' | 'RIGHT', table: string, on: string): QueryBuilder {
        this.joins.push(`${type} JOIN ${table} ON ${on}`);
        return this;
    }

    where(rule: JsonLogicRuleNode, options: Omit<SqlBuildOptions, 'wrapInParentheses'> = {}): QueryBuilder {
        if (!rule || isEmpty(rule)) {
            return this;
        }

        const result = convertJsonLogicToSql(rule, { ...options, wrapInParentheses: true });

        this.whereClause = `WHERE ${result.sql}`;
        this.parameters = { ...this.parameters, ...result.parameters };

        return this;
    }

    orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): QueryBuilder {
        this.orderByClause = `ORDER BY ${field} ${direction}`;
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
        if (!this.fromTable && this.joins.length === 0 && this.whereClause) {
            return {
                sql: this.whereClause,
                parameters: this.parameters,
            };
        }

        const selectClause = `SELECT ${isArray(this.fields) ? this.fields.join(', ') : this.fields}`;
        const fromClause = `FROM ${this.fromTable}`;
        const joinClause = join(this.joins, ' ');

        const sql = compact([
            selectClause,
            fromClause,
            joinClause,
            this.whereClause,
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
        this.whereClause = '';
        this.orderByClause = '';
        this.limitClause = '';
        this.offsetClause = '';
        this.parameters = {};
        return this;
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
