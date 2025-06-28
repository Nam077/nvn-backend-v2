# JsonLogic to SQL Builder

Một utility mạnh mẽ để convert JsonLogic expressions thành SQL WHERE clauses với khả năng customize cao.

## Tính năng chính

- ✅ Hỗ trợ đầy đủ các operators của JsonLogic
- ✅ Type-safe và có thể extend
- ✅ Parameterized queries để tránh SQL injection
- ✅ Customizable field mapping và table aliases
- ✅ Comprehensive test coverage
- ✅ Easy to use với factory functions

## Cài đặt và Import

```typescript
import { JsonLogicToSqlBuilder, convertJsonLogicToSql, createJsonLogicToSqlBuilder } from '@/common/query-builder';
```

## Cách sử dụng cơ bản

### 1. Sử dụng utility function (đơn giản nhất)

```typescript
const rule = { equals: ['name', 'John'] };
const result = convertJsonLogicToSql(rule);

console.log(result.sql); // "(name = :param0)"
console.log(result.parameters); // { param0: 'John' }
```

### 2. Sử dụng Builder class

```typescript
const builder = new JsonLogicToSqlBuilder();
const rule = {
    and: [{ equals: ['status', 'active'] }, { gt: ['age', 18] }],
};

const result = builder.build(rule);
console.log(result.sql); // "((status = :param0) AND (age > :param1))"
console.log(result.parameters); // { param0: 'active', param1: 18 }
```

### 3. Với options customize

```typescript
const builder = new JsonLogicToSqlBuilder({
    tableAlias: 'u',
    fieldMapper: (field) => `custom_${field}`,
    wrapInParentheses: false,
});

const rule = { equals: ['name', 'John'] };
const result = builder.build(rule);
// Result: "u.custom_name = :param0"
```

## Các operators được hỗ trợ

### Logic Operators

- `and` - AND logic
- `or` - OR logic
- `not` - NOT logic

### Comparison Operators

- `equals`, `==` - Equals
- `not_equals`, `!=` - Not equals
- `gt`, `>` - Greater than
- `gte`, `>=` - Greater than or equal
- `lt`, `<` - Less than
- `lte`, `<=` - Less than or equal

### String Operators

- `contains` - String contains
- `not_contains` - String not contains
- `starts_with` - String starts with
- `ends_with` - String ends with
- `like` - SQL LIKE pattern
- `not_like` - SQL NOT LIKE pattern
- `is_empty` - String is null or empty
- `is_not_empty` - String is not null and not empty

### Array Operators

- `in` - Value in array
- `not_in` - Value not in array

### Null Checks

- `is_null` - Field is null
- `is_not_null` - Field is not null

### Range Operators

- `between` - Value between range
- `not_between` - Value not between range

## Ví dụ các operators

### Logic operators

```typescript
// AND condition
const andRule = {
    and: [{ equals: ['status', 'active'] }, { gt: ['loginCount', 5] }],
};
// Result: ((status = :param0) AND (loginCount > :param1))

// OR condition
const orRule = {
    or: [{ equals: ['role', 'admin'] }, { equals: ['role', 'moderator'] }],
};
// Result: ((role = :param0) OR (role = :param1))

// NOT condition
const notRule = { not: { equals: ['status', 'deleted'] } };
// Result: (NOT (status = :param0))
```

### String operators

```typescript
// Contains
const containsRule = { contains: ['name', 'John'] };
// Result: (name LIKE :param0) with param0 = '%John%'

// Starts with
const startsRule = { starts_with: ['email', 'admin'] };
// Result: (email LIKE :param0) with param0 = 'admin%'

// Is empty
const emptyRule = { is_empty: 'description' };
// Result: (description IS NULL OR description = '')
```

### Array operators

```typescript
// In array
const inRule = { in: ['status', ['active', 'pending', 'processing']] };
// Result: (status IN (:param0, :param1, :param2))

// Between range
const betweenRule = { between: ['age', 18, 65] };
// Result: (age BETWEEN :param0 AND :param1)
```

## Customization nâng cao

### 1. Custom Field Mapping

```typescript
class CustomSqlBuilder extends JsonLogicToSqlBuilder {
    protected mapFieldName(field: string): string {
        const mappings = {
            fullName: "first_name || ' ' || last_name",
            isActive: "status = 'active'",
            hasProfile: 'profile_id IS NOT NULL',
        };

        return mappings[field] || super.mapFieldName(field);
    }
}
```

### 2. Custom Operators

```typescript
class UserSqlBuilder extends JsonLogicToSqlBuilder {
    protected buildCondition(rule: any): string {
        if (typeof rule === 'object' && rule !== null) {
            const operator = Object.keys(rule)[0];
            const operands = rule[operator];

            // Custom operator: is_premium_user
            if (operator === 'is_premium_user') {
                return operands
                    ? "(subscription_type IN ('premium', 'enterprise'))"
                    : "(subscription_type IS NULL OR subscription_type = 'free')";
            }

            // Custom operator: has_permission
            if (operator === 'has_permission') {
                const paramName = this.addParameter(operands);
                return `EXISTS (
                    SELECT 1 FROM user_permissions up 
                    WHERE up.user_id = u.id AND up.permission = :${paramName}
                )`;
            }
        }

        return super.buildCondition(rule);
    }
}
```

### 3. Sử dụng với Options

```typescript
const options = {
    tableAlias: 'u', // Add table alias
    fieldMapper: (field) => `u.${field}`, // Custom field mapping
    wrapInParentheses: false, // Don't wrap result
};

const builder = new JsonLogicToSqlBuilder(options);
```

## Examples thực tế

### User Management Query

```typescript
const userQuery = {
    and: [
        { equals: ['isActive', true] },
        {
            or: [
                { equals: ['role', 'admin'] },
                {
                    and: [{ equals: ['role', 'user'] }, { gt: ['loginCount', 10] }],
                },
            ],
        },
        { is_not_null: 'emailVerifiedAt' },
    ],
};

const result = convertJsonLogicToSql(userQuery, { tableAlias: 'u' });
```

### Font Search Query

```typescript
const fontQuery = {
    and: [
        { contains: ['name', 'arial'] },
        { in: ['category', ['serif', 'sans-serif']] },
        { equals: ['isActive', true] },
        { between: ['price', 0, 100] },
    ],
};

const result = convertJsonLogicToSql(fontQuery, { tableAlias: 'f' });
```

## Security Features

- **Parameterized Queries**: Tất cả values được bind qua parameters để tránh SQL injection
- **Type Safety**: TypeScript support đầy đủ
- **Validation**: Built-in validation cho operators và operands

## Performance

- Lightweight và fast
- Minimal dependencies (chỉ dùng lodash utilities)
- Reusable builder instances với `reset()` method
- Efficient parameter handling

## Error Handling

Builder sẽ throw descriptive errors cho:

- Unsupported operators
- Invalid operand structures
- Missing required parameters
- Invalid field references

```typescript
try {
    const result = builder.build(invalidRule);
} catch (error) {
    console.error('JsonLogic to SQL conversion failed:', error.message);
}
```

## Best Practices

1. **Reuse Builder Instances**: Tạo một instance và reuse với `reset()`
2. **Use Factory Functions**: Cho simple use cases, dùng `convertJsonLogicToSql()`
3. **Custom Builders**: Extend class cho specific business logic
4. **Table Aliases**: Luôn dùng table aliases cho complex queries
5. **Error Handling**: Wrap conversion trong try-catch blocks

## Testing

```bash
# Run tests
npm test src/common/query-builder/json-logic-to-sql.builder.spec.ts
```

Test file cũng chứa nhiều examples và best practices để tham khảo.
