# Query Builder Module

## Overview

This module provides a powerful and flexible way to build SQL queries dynamically from JsonLogic rules. It consists of two main components:

1.  `JsonLogicToSqlBuilder`: Converts JsonLogic rule objects into parameterized SQL `WHERE` clauses.
2.  `QueryBuilder`: A fluent API to construct full SQL queries (`SELECT`, `FROM`, `JOIN`, `WHERE`, `ORDER BY`, etc.) that integrates with the `JsonLogicToSqlBuilder`.

This combination allows for safe, dynamic query generation, protecting against SQL injection by using parameterized queries.

## `JsonLogicToSqlBuilder`

This class is the core of the conversion process. It parses a JsonLogic object and produces an SQL condition string and a corresponding map of parameters.

### Basic Usage

```typescript
import { JsonLogicToSqlBuilder, JsonLogicRuleNode } from './json-logic-to-sql.builder';

const rule: JsonLogicRuleNode = {
    and: [{ '==': [{ var: 'status' }, 'active'] }, { '>': [{ var: 'age' }, 30] }],
};

const builder = new JsonLogicToSqlBuilder({ tableAlias: 'u' });
const { sql, parameters } = builder.build(rule);

console.log(sql);
// Output: (u.status = :param0 AND u.age > :param1)

console.log(parameters);
// Output: { param0: 'active', param1: 30 }
```

### Options

The builder can be configured with the following options:

- `tableAlias` (string): A prefix to add to all field names (e.g., `u` results in `u.fieldName`).
- `fieldMapper` ((field: string) => string): A function for custom field name mapping.
- `valueEscaper` ((value: any) => string): A custom function to escape values (not generally needed as the builder uses parameters).
- `wrapInParentheses` (boolean, default: `true`): Whether to wrap the final SQL in parentheses.

### Extending the Builder

For more complex scenarios, you can extend `JsonLogicToSqlBuilder` to add custom logic, such as mapping frontend field names to database column names.

```typescript
import { JsonLogicToSqlBuilder } from './json-logic-to-sql.builder';

class UserQueryBuilder extends JsonLogicToSqlBuilder {
    protected mapFieldName(field: string): string {
        const fieldMap: Record<string, string> = {
            userName: 'username',
            isActive: 'status',
        };

        const mappedField = fieldMap[field] || field;

        // Always call the super method to apply table alias
        return super.mapFieldName(mappedField);
    }
}

const userRule: JsonLogicRuleNode = {
    '==': [{ var: 'userName' }, 'testuser'],
};

const customBuilder = new UserQueryBuilder({ tableAlias: 'users' });
const { sql, parameters } = customBuilder.build(userRule);

console.log(sql);
// Output: (users.username = :param0)

console.log(parameters);
// Output: { param0: 'testuser' }
```

### Supported Operators

The builder supports a wide range of standard JsonLogic operators, which are internally validated against a safelist to prevent security risks.

- **Logical**: `and`, `or`, `not`
- **Equality**: `==` (or `equals`), `!=` (or `not_equals`)
- **Comparison**: `>`, `gt`, `>=`, `gte`, `<`, `lt`, `<=`, `lte`
- **String**: `contains`, `not_contains`, `starts_with`, `ends_with`, `like`, `not_like`
- **Array/Set**: `in`, `not_in`
- **Null/Empty**: `is_null`, `is_not_null`, `is_empty`, `is_not_empty`
- **Range**: `between`, `not_between`

---

## `QueryBuilder`

`QueryBuilder` is a fluent (chainable) utility to construct complete SQL queries.

### Basic Usage

The `where()` method seamlessly integrates with `JsonLogicToSqlBuilder`.

```typescript
import { QueryBuilder } from './query-utils';
import { JsonLogicRuleNode } from './json-logic-to-sql.builder';

const rule: JsonLogicRuleNode = {
    and: [{ '==': [{ var: 'role' }, 'admin'] }, { in: [{ var: 'department' }, ['IT', 'HR']] }],
};

const builder = new QueryBuilder();

const { sql, parameters } = builder
    .select(['id', 'name', 'email'])
    .from('users', 'u')
    .where(rule, { tableAlias: 'u' }) // Pass JsonLogic rule and options here
    .orderBy('name', 'ASC')
    .limit(50)
    .offset(0)
    .build();

console.log(sql);
// Output: SELECT id, name, email FROM users AS u WHERE (u.role = :param0 AND u.department IN (:param1, :param2)) ORDER BY name ASC LIMIT 50 OFFSET 0

console.log(parameters);
// Output: { param0: 'admin', param1: 'IT', param2: 'HR' }
```

### Methods

- `.select(fields: string | string[])`: Specifies the columns to select.
- `.from(tableName: string, alias?: string)`: Specifies the main table.
- `.join(type: 'INNER' | 'LEFT' | 'RIGHT', table: string, on: string)`: Adds a join clause.
- `.where(rule: JsonLogicRuleNode, options?: SqlBuildOptions)`: Applies a `WHERE` clause from a JsonLogic rule.
- `.orderBy(field: string, direction: 'ASC' | 'DESC')`: Adds an `ORDER BY` clause.
- `.limit(limit: number)`: Adds a `LIMIT` clause.
- `.offset(offset: number)`: Adds an `OFFSET` clause.
- `.build()`: Constructs the final SQL string and parameters object.
- `.reset()`: Resets the builder to its initial state for reuse.

---

## JSONB Querying

The builder has built-in support for querying nested fields within `JSONB` columns using `->` notation in your JsonLogic rules. This avoids ambiguity with joined table fields, which use standard dot notation.

- **JSONB paths**: Use `->` (e.g., `metadata->author->name`).
- **Joined fields**: Use `.` (e.g., `users.profile_id`).

When the builder detects a field name with `->` (e.g., `metadata->author`), it automatically translates it into the correct PostgreSQL `JSONB` path query syntax (`->` for nesting and `->>` for the final text value).

### Example

Suppose you have a `fonts` table with a `metadata` column of type `JSONB`.

```json
{
    "license": "OFL",
    "author": {
        "name": "Nhan",
        "website": "nhan.com"
    },
    "tags": ["serif", "display"]
}
```

You can write JsonLogic rules to query this structure as follows:

```typescript
import { convertJsonLogicToSql } from './json-logic-to-sql.builder';

// Query a top-level key
const rule1: JsonLogicRuleNode = {
    '==': [{ var: 'metadata->license' }, 'OFL'],
};
const result1 = convertJsonLogicToSql(rule1, { tableAlias: 'f' });
// result1.sql: (f.metadata->>'license' = :param0)

// Query a nested key
const rule2: JsonLogicRuleNode = {
    starts_with: [{ var: 'metadata->author->website' }, 'nhan'],
};
const result2 = convertJsonLogicToSql(rule2, { tableAlias: 'f' });
// result2.sql: (f.metadata->'author'->>'website' LIKE :param0)
// result2.parameters: { param0: 'nhan%' }

// Note: Querying arrays within JSONB is not yet supported with operators like 'in'.
// For example, `{"in": ["serif", {"var": "metadata->tags"}]}` is not supported.
```

This feature works with all existing comparison operators (`==`, `!=`, `contains`, `in`, `>`, `<`, etc.), allowing for powerful and intuitive querying of your `JSONB` data.
