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
            operators: ['equals', 'not_equals', 'contains'],
        },
        isActive: {
            type: 'boolean',
            label: 'Is Active',
            operators: ['equals'],
            defaultValue: true,
        },
        fontType: {
            type: 'select',
            label: 'Font Type',
            operators: ['equals', 'in'],
            listValues: [
                { label: 'Free', value: 'free' },
                { label: 'VIP', value: 'vip' },
                { label: 'Paid', value: 'paid' },
            ],
        },
        downloadCount: {
            type: 'number',
            label: 'Downloads',
            operators: ['gt', 'lt', 'equals'],
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

    describe('Valid Rules', () => {
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

        it('should validate a nested rule with "or"', () => {
            const rule = {
                and: [
                    { '==': [{ var: 'isActive' }, true] },
                    {
                        or: [{ '==': [{ var: 'fontType' }, 'free'] }, { '>': [{ var: 'downloadCount' }, 1000] }],
                    },
                ],
            };
            expect(() => validator.validate(rule)).not.toThrow();
        });

        it('should allow a `var` with a default value', () => {
            const rule = { '==': [{ var: ['name', 'default name'] }, 'some name'] };
            expect(() => validator.validate(rule)).not.toThrow();
        });
    });

    describe('Invalid Rules', () => {
        it('should throw an error for a field that is not queryable', () => {
            const rule = { '==': [{ var: 'secretField' }, 'value'] };
            expect(() => validator.validate(rule)).toThrow('Field "secretField" is not queryable.');
        });

        it('should throw an error for an operator not allowed for a specific field', () => {
            const rule = { '>': [{ var: 'isActive' }, 0] };
            expect(() => validator.validate(rule)).toThrow('Operator ">" is not allowed for field "isActive".');
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
