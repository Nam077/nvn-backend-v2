import {
    isArray,
    isObject,
    map as lodashMap,
    snakeCase,
    transform,
    camelCase,
    get,
    set,
    isString,
    includes,
    split,
    join,
} from 'lodash';

type CaseType = 'snake' | 'camel';

const caseFunctionMap = {
    snake: snakeCase,
    camel: camelCase,
};

/**
 * Converts a single string to a specified case.
 * @param str The string to convert.
 * @param targetCase The target case.
 * @returns The converted string.
 */
export const convertCase = (str: string, targetCase: CaseType): string =>
    get(caseFunctionMap, targetCase, (s: string) => s)(str);

/**
 * Recursively walks through a JsonLogic rule and applies a case conversion
 * to the values of all 'var' keys using Lodash functions.
 *
 * @param data - The JsonLogic rule or a part of it.
 * @param targetCase - The target case ('snake' or 'camel').
 * @returns The rule with 'var' values converted.
 */
export const deepConvertCase = (data: any, targetCase: CaseType): any => {
    if (isArray(data)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return lodashMap(data, (item) => deepConvertCase(item, targetCase));
    }

    if (isObject(data)) {
        // Specifically handle the 'var' node using lodash functions
        const varValue = get(data, 'var');
        if (varValue && isString(varValue)) {
            // Handle dot notation for joined fields (e.g., "roles.name")
            if (includes(varValue, '.')) {
                const parts = split(varValue, '.');
                const column = parts.pop(); // Get the last part (column name)
                if (column) {
                    const convertedColumn = convertCase(column, targetCase);
                    return { var: join([...parts, convertedColumn], '.') };
                }
            }
            return { var: convertCase(varValue, targetCase) };
        }

        // For other objects (like { "and": [...] }), recurse on their values
        return transform(
            data,
            (result: Record<string, any>, value: any, key: string) => {
                // Using lodash.set for safer property assignment

                set(result, key, deepConvertCase(value, targetCase));
            },
            {},
        );
    }

    // Return primitives as they are
    return data;
};
