/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable max-nested-callbacks */
import { JsonLogicValidator, QueryConfig } from './json-logic.validator';

const mockFontQueryConfig: QueryConfig = {
    name: 'FONT_MANAGEMENT',
    fields: {
        name: {
            type: 'text',
            label: 'Font Name',
            operators: [
                'equals',
                'not_equals',
                'contains',
                'not_contains',
                'like',
                'not_like',
                'starts_with',
                'ends_with',
                'is_empty',
                'is_not_empty',
                'is_null',
                'is_not_null',
            ],
        },
        isActive: {
            type: 'boolean',
            label: 'Is Active',
            operators: ['equals', 'is_null', 'is_not_null'],
            defaultValue: true,
        },
        fontType: {
            type: 'select',
            label: 'Font Type',
            operators: ['equals', 'not_equals', 'in', 'not_in', 'is_null', 'is_not_null'],
            listValues: [
                { label: 'Free', value: 'free' },
                { label: 'VIP', value: 'vip' },
                { label: 'Paid', value: 'paid' },
            ],
        },
        downloadCount: {
            type: 'number',
            label: 'Downloads',
            operators: [
                'equals',
                'not_equals',
                'gt',
                'gte',
                'lt',
                'lte',
                'between',
                'not_between',
                'in',
                'not_in',
                'is_null',
                'is_not_null',
            ],
        },
        createdAt: {
            type: 'datetime',
            label: 'Created At',
            operators: [
                'equals',
                'not_equals',
                'gt',
                'gte',
                'lt',
                'lte',
                'between',
                'not_between',
                'is_null',
                'is_not_null',
            ],
        },
    },
    sortableFields: ['name', 'downloadCount', 'createdAt'],
    selectableFields: ['id', 'name', 'slug', 'fontType', 'isActive'],
};

describe('JsonLogicValidator', () => {
    let validator: JsonLogicValidator;

    beforeEach(() => {
        validator = new JsonLogicValidator(mockFontQueryConfig);
    });

    it('should be defined', () => {
        expect(validator).toBeDefined();
    });

    describe('Basic Valid Rules', () => {
        it('should validate a simple rule with an allowed field and operator', () => {
            const rule = { '==': [{ var: 'isActive' }, true] };
            expect(() => validator.validate(rule)).not.toThrow();
        });

        it('should validate a rule with the "in" operator', () => {
            const rule = { in: [{ var: 'fontType' }, ['free', 'vip']] };
            expect(() => validator.validate(rule)).not.toThrow();
        });

        it('should validate a complex rule with "and"', () => {
            const rule = {
                and: [
                    { '==': [{ var: 'isActive' }, true] },
                    { contains: [{ var: 'name' }, 'Roboto'] },
                    { '>': [{ var: 'downloadCount' }, 100] },
                ],
            };
            expect(() => validator.validate(rule)).not.toThrow();
        });

        it('should allow a `var` with a default value', () => {
            const rule = { '==': [{ var: ['name', 'default name'] }, 'some name'] };
            expect(() => validator.validate(rule)).not.toThrow();
        });
    });

    describe('Text Search Operators', () => {
        it('should validate "not_contains" operator', () => {
            const rule = { not_contains: [{ var: 'name' }, 'Arial'] };
            expect(() => validator.validate(rule)).not.toThrow();
        });

        it('should validate "like" operator', () => {
            const rule = { like: [{ var: 'name' }, '%Roboto%'] };
            expect(() => validator.validate(rule)).not.toThrow();
        });

        it('should validate "not_like" operator', () => {
            const rule = { not_like: [{ var: 'name' }, '%Comic%'] };
            expect(() => validator.validate(rule)).not.toThrow();
        });

        it('should validate "starts_with" operator', () => {
            const rule = { starts_with: [{ var: 'name' }, 'Open'] };
            expect(() => validator.validate(rule)).not.toThrow();
        });

        it('should validate "ends_with" operator', () => {
            const rule = { ends_with: [{ var: 'name' }, 'Sans'] };
            expect(() => validator.validate(rule)).not.toThrow();
        });
    });

    describe('Null/Empty Check Operators', () => {
        it('should validate "is_null" operator', () => {
            const rule = { is_null: [{ var: 'name' }] };
            expect(() => validator.validate(rule)).not.toThrow();
        });

        it('should validate "is_not_null" operator', () => {
            const rule = { is_not_null: [{ var: 'fontType' }] };
            expect(() => validator.validate(rule)).not.toThrow();
        });

        it('should validate "is_empty" operator', () => {
            const rule = { is_empty: [{ var: 'name' }] };
            expect(() => validator.validate(rule)).not.toThrow();
        });

        it('should validate "is_not_empty" operator', () => {
            const rule = { is_not_empty: [{ var: 'name' }] };
            expect(() => validator.validate(rule)).not.toThrow();
        });
    });

    describe('Array/Set Operators', () => {
        it('should validate "not_in" operator for enums', () => {
            const rule = { not_in: [{ var: 'fontType' }, ['paid']] };
            expect(() => validator.validate(rule)).not.toThrow();
        });

        it('should validate "not_in" operator for numbers', () => {
            const rule = { not_in: [{ var: 'downloadCount' }, [0, 1, 2]] };
            expect(() => validator.validate(rule)).not.toThrow();
        });

        it('should throw error for "not_in" with invalid enum values', () => {
            const rule = { not_in: [{ var: 'fontType' }, ['invalid_type']] };
            expect(() => validator.validate(rule)).toThrow(
                'Value(s) "invalid_type" are not allowed for field "fontType". Permitted values are: free, vip, paid.',
            );
        });
    });

    describe('Range Operators', () => {
        it('should validate "between" operator for numbers', () => {
            const rule = { between: [{ var: 'downloadCount' }, 10, 100] };
            expect(() => validator.validate(rule)).not.toThrow();
        });

        it('should validate "not_between" operator for numbers', () => {
            const rule = { not_between: [{ var: 'downloadCount' }, 0, 5] };
            expect(() => validator.validate(rule)).not.toThrow();
        });

        it('should validate "between" operator for dates', () => {
            const rule = { between: [{ var: 'createdAt' }, '2023-01-01', '2023-12-31'] };
            expect(() => validator.validate(rule)).not.toThrow();
        });

        it('should throw error for "between" with invalid range (min > max)', () => {
            const rule = { between: [{ var: 'downloadCount' }, 100, 10] };
            expect(() => validator.validate(rule)).toThrow(
                'Range operator "between" requires min value (100) to be less than or equal to max value (10).',
            );
        });
    });

    describe('Argument Validation', () => {
        it('should throw error for unary operator with wrong argument count', () => {
            const rule = { is_null: [{ var: 'name' }, 'extra_arg'] };
            expect(() => validator.validate(rule)).toThrow(
                'Operator "is_null" requires exactly 1 arguments, but got 2.',
            );
        });

        it('should throw error for binary operator with wrong argument count', () => {
            const rule = { '==': [{ var: 'name' }] };
            expect(() => validator.validate(rule)).toThrow('Operator "==" requires exactly 2 arguments, but got 1.');
        });

        it('should throw error for range operator with wrong argument count', () => {
            const rule = { between: [{ var: 'downloadCount' }, 10] };
            expect(() => validator.validate(rule)).toThrow(
                'Operator "between" requires exactly 3 arguments, but got 2.',
            );
        });
    });

    describe('Complex Valid Rules', () => {
        it('should validate a comprehensive query with multiple new operators', () => {
            const rule = {
                and: [
                    { is_not_null: [{ var: 'name' }] },
                    { not_like: [{ var: 'name' }, '%test%'] },
                    { between: [{ var: 'downloadCount' }, 10, 1000] },
                    { not_in: [{ var: 'fontType' }, ['paid']] },
                ],
            };
            expect(() => validator.validate(rule)).not.toThrow();
        });

        it('should validate nested rules with new operators', () => {
            const rule = {
                or: [
                    {
                        and: [{ starts_with: [{ var: 'name' }, 'Open'] }, { '>': [{ var: 'downloadCount' }, 100] }],
                    },
                    {
                        and: [{ ends_with: [{ var: 'name' }, 'Sans'] }, { in: [{ var: 'fontType' }, ['free', 'vip']] }],
                    },
                ],
            };
            expect(() => validator.validate(rule)).not.toThrow();
        });
    });

    describe('Invalid Rules', () => {
        it('should throw an error for a field that is not queryable', () => {
            const rule = { '==': [{ var: 'secretField' }, 'value'] };
            expect(() => validator.validate(rule)).toThrow('Field "secretField" is not queryable.');
        });

        it('should throw an error for an operator not allowed for a specific field', () => {
            const rule = { between: [{ var: 'isActive' }, 0, 1] };
            expect(() => validator.validate(rule)).toThrow('Operator "between" is not allowed for field "isActive".');
        });

        it('should throw an error for a globally disallowed operator', () => {
            const rule = { some_evil_operator: [{ var: 'name' }, 'test'] };
            expect(() => validator.validate(rule)).toThrow(
                'Operator "some_evil_operator" is not allowed by this blueprint.',
            );
        });

        it('should throw an error for a malformed rule (non-object)', () => {
            const rule = 'invalid-rule' as any;
            expect(() => validator.validate(rule)).toThrow('Rule must be a non-array object.');
        });

        it('should throw an error for a logic node with multiple keys', () => {
            const rule = { '==': [{ var: 'name' }, 'test'], '!=': [{ var: 'isActive' }, false] };
            expect(() => validator.validate(rule as any)).toThrow(
                'Invalid logic node: must have exactly one key, but found: ==, !=',
            );
        });

        it('should throw an error for a `var` with a non-string path', () => {
            const rule = { '==': [{ var: 123 }, 'test'] };
            expect(() => validator.validate(rule)).toThrow("'var' path must be a string.");
        });

        it('should throw an error for an "in" operator with invalid values from listValues', () => {
            const rule = { in: [{ var: 'fontType' }, ['free', 'vip', 'invalid_type']] };
            expect(() => validator.validate(rule)).toThrow(
                'Value(s) "invalid_type" are not allowed for field "fontType". Permitted values are: free, vip, paid.',
            );
        });

        it('should throw an error for an operator with non-array arguments', () => {
            const rule = { '==': { var: 'name' } };
            expect(() => validator.validate(rule as any)).toThrow('Arguments for operator "==" must be in an array.');
        });
    });
});
