/* eslint-disable no-console */
import ejs from 'ejs';
import fs from 'fs/promises';
import { glob } from 'glob';
import inquirer from 'inquirer';
import {
    filter,
    last,
    map,
    partition,
    replace,
    snakeCase,
    some,
    split,
    toUpper,
    trim,
    size,
    includes,
    toLower,
} from 'lodash';
import path from 'path';
import { Project, PropertyDeclaration } from 'ts-morph';

// --- Configuration ---
const TEMPLATE_PATH = path.resolve(process.cwd(), 'scripts/templates/blueprint.ejs');
const OUTPUT_DIR = path.resolve(process.cwd(), 'src/queries/blueprints');
const ENTITY_GLOB_PATTERN = 'src/modules/**/*.entity.ts';

// --- Type Definitions ---
interface ParsedField {
    name: string;
    type: string;
    isRelation: boolean;
    isEnum: boolean;
    enumName?: string;
    suggestedOperators: string[];
}

interface EntityInfo {
    modelName: string;
    modulePath: string;
    entityFileName: string;
    fullPath: string;
}
const PRIMITIVE_TYPES = ['string', 'number', 'boolean', 'Date', 'uuid'];

// --- Smart Type-to-Operator Mapping ---
const getOperatorsForType = (type: string): string[] => {
    const lowerType = toLower(type);

    // Date types - comprehensive set
    if (includes(lowerType, 'date')) {
        return [
            'DATE_OPERATORS.EQUALS',
            'DATE_OPERATORS.NOT_EQUALS',
            'DATE_OPERATORS.GT',
            'DATE_OPERATORS.GTE',
            'DATE_OPERATORS.LT',
            'DATE_OPERATORS.LTE',
            'DATE_OPERATORS.BETWEEN',
            'DATE_OPERATORS.IS_NULL',
            'DATE_OPERATORS.IS_NOT_NULL',
        ];
    }

    // Number types - comprehensive set
    if (includes(lowerType, 'number') || includes(lowerType, 'int') || includes(lowerType, 'decimal')) {
        return [
            'NUMBER_OPERATORS.EQUALS',
            'NUMBER_OPERATORS.NOT_EQUALS',
            'NUMBER_OPERATORS.GT',
            'NUMBER_OPERATORS.GTE',
            'NUMBER_OPERATORS.LT',
            'NUMBER_OPERATORS.LTE',
            'NUMBER_OPERATORS.BETWEEN',
            'NUMBER_OPERATORS.IS_NULL',
            'NUMBER_OPERATORS.IS_NOT_NULL',
        ];
    }

    // Boolean types
    if (includes(lowerType, 'boolean')) {
        return ['BOOLEAN_OPERATORS.EQUALS', 'BOOLEAN_OPERATORS.IS_NULL', 'BOOLEAN_OPERATORS.IS_NOT_NULL'];
    }

    // String types - comprehensive set
    if (includes(lowerType, 'string') || includes(lowerType, 'text')) {
        // ID fields - limited operators
        if (includes(lowerType, 'id') || lowerType === 'uuid') {
            return [
                'STRING_OPERATORS.EQUALS',
                'STRING_OPERATORS.NOT_EQUALS',
                'STRING_OPERATORS.IN',
                'STRING_OPERATORS.NOT_IN',
                'STRING_OPERATORS.IS_NULL',
                'STRING_OPERATORS.IS_NOT_NULL',
            ];
        }
        // Regular string fields - full text search capabilities
        return [
            'STRING_OPERATORS.EQUALS',
            'STRING_OPERATORS.NOT_EQUALS',
            'STRING_OPERATORS.CONTAINS',
            'STRING_OPERATORS.NOT_CONTAINS',
            'STRING_OPERATORS.LIKE',
            'STRING_OPERATORS.NOT_LIKE',
            'STRING_OPERATORS.STARTS_WITH',
            'STRING_OPERATORS.ENDS_WITH',
            'STRING_OPERATORS.IS_EMPTY',
            'STRING_OPERATORS.IS_NOT_EMPTY',
            'STRING_OPERATORS.IS_NULL',
            'STRING_OPERATORS.IS_NOT_NULL',
        ];
    }

    // Default fallback for unknown types
    return ['STRING_OPERATORS.EQUALS', 'STRING_OPERATORS.NOT_EQUALS'];
};

// Check if field name suggests it should be treated as enum
const isLikelyEnum = (fieldName: string): boolean => {
    const enumPatterns = ['status', 'type', 'state', 'role', 'permission', 'level'];
    return some(enumPatterns, (pattern) => includes(toLower(fieldName), pattern));
};

// --- Helper Functions ---

const isPrimitiveType = (type: string) =>
    // Check if the type string includes any of the primitive types
    // This handles simple cases like 'string' and more complex ones like 'string | null'
    some(PRIMITIVE_TYPES, (p) => includes(type, p));

// Helper function to extract enum name from decorator
const extractEnumName = (property: PropertyDeclaration): string | undefined => {
    const decorators = property.getDecorators();
    for (const decorator of decorators) {
        const decoratorText = decorator.getFullText();

        if (includes(decoratorText, '@Column') && includes(decoratorText, 'DataType.ENUM')) {
            // Try to extract enum name from patterns like:
            // DataType.ENUM(...values(COLLECTION_TYPE))
            const enumMatch = decoratorText.match(/values\(([A-Z_]+)\)/);
            if (enumMatch && enumMatch[1]) {
                return enumMatch[1];
            }
        }
    }
    return undefined;
};

// Helper function to check if a property is an enum based on its decorators
const isEnumProperty = (property: PropertyDeclaration): boolean => {
    const decorators = property.getDecorators();
    for (const decorator of decorators) {
        const decoratorText = decorator.getFullText();

        // Check @Column for enum indicators
        if (includes(decoratorText, '@Column')) {
            if (
                includes(decoratorText, 'DataType.ENUM') ||
                includes(decoratorText, 'type: DataType.ENUM') ||
                includes(decoratorText, 'ENUM(')
            ) {
                return true;
            }
        }

        // Check @ApiProperty for enum hints
        if (includes(decoratorText, '@ApiProperty')) {
            if (includes(decoratorText, 'enum:') || includes(decoratorText, 'enum: ')) {
                return true;
            }
        }
    }
    return false;
};

/**
 * Uses ts-morph to parse an entity file and extract its properties with smart operator suggestions.
 * @param filePath - The absolute path to the entity file.
 * @returns An array of parsed field information with suggested operators.
 */
const parseEntityFields = (filePath: string): ParsedField[] => {
    const project = new Project();
    const sourceFile = project.addSourceFileAtPath(filePath);
    const classDeclaration = sourceFile.getClasses()[0];

    if (!classDeclaration) {
        console.warn(`   ⚠️ Could not find a class declaration in ${path.basename(filePath)}.`);
        return [];
    }

    const properties = classDeclaration.getProperties();

    return map(properties, (property: PropertyDeclaration) => {
        const name = property.getName();
        const type = property.getType().getText(property);
        let isRelation = !isPrimitiveType(type);

        const isEnumField = isEnumProperty(property) || isLikelyEnum(name);
        const enumName = isEnumField ? extractEnumName(property) : undefined;

        // Override relation detection for enum fields
        if (isEnumField) {
            isRelation = false;
        }

        let suggestedOperators: string[];
        if (isRelation) {
            suggestedOperators = [];
        } else if (isEnumField) {
            suggestedOperators = [
                'ENUM_OPERATORS.EQUALS',
                'ENUM_OPERATORS.NOT_EQUALS',
                'ENUM_OPERATORS.IN',
                'ENUM_OPERATORS.NOT_IN',
                'ENUM_OPERATORS.IS_NULL',
                'ENUM_OPERATORS.IS_NOT_NULL',
            ];
        } else {
            suggestedOperators = getOperatorsForType(type);
        }

        return { name, type, isRelation, isEnum: isEnumField, enumName, suggestedOperators };
    });
};

const findEntities = async (): Promise<EntityInfo[]> => {
    const entityFiles = await glob(ENTITY_GLOB_PATTERN, { absolute: true });

    const entityInfoPromises = map(entityFiles, async (filePath): Promise<EntityInfo | null> => {
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const match = fileContent.match(/export class (\w+)/);

            if (!match || !match[1]) {
                console.warn(`   ⚠️ Could not parse model name from ${path.basename(filePath)}. Skipping.`);
                return null;
            }

            const [, modelName] = match;
            const parts = split(filePath, '/');
            const fileName = last(parts) || '';
            const entityFileName = replace(fileName, '.entity.ts', '');
            const modulePath = parts[parts.length - 3];

            return {
                modelName,
                modulePath,
                entityFileName,
                fullPath: filePath,
            };
        } catch {
            console.warn(`   ⚠️ Could not read or process ${path.basename(filePath)}. Skipping.`);
            return null;
        }
    });

    const results = await Promise.all(entityInfoPromises);
    return filter(results, (result): result is EntityInfo => result !== null);
};

/**
 * Main generator function.
 */
const main = async () => {
    console.log('🔵--- Blueprint Generator ---🔵');
    console.log('🔍 Scanning for entities...');

    const entities = await findEntities();
    if (size(entities) === 0) {
        console.error('❌ No entity files found. Please create an entity first.');
        return;
    }

    console.log(`✅ Found ${size(entities)} entities.`);

    // 1. Get user input
    const { selectedEntityPath } = await inquirer.prompt<{ selectedEntityPath: string }>([
        {
            type: 'list',
            name: 'selectedEntityPath',
            message: 'Select the entity to generate a blueprint for:',
            choices: map(entities, (e) => ({
                name: `${e.modelName} (from modules/${e.modulePath})`,
                value: e.fullPath,
            })),
        },
    ]);

    const selectedEntity = entities.find((e) => e.fullPath === selectedEntityPath);
    if (!selectedEntity) {
        console.error('❌ Invalid selection. Exiting.');
        return;
    }

    console.log(`🔎 Analyzing fields for ${selectedEntity.modelName}...`);
    const allFields = parseEntityFields(selectedEntity.fullPath);
    const [relations, fields] = partition(allFields, (field) => field.isRelation);

    console.log(`   - Found ${fields.length} primitive fields.`);
    console.log(`   - Found ${relations.length} potential relations.`);

    const { modelName, modulePath, entityFileName } = selectedEntity;
    const outputFileName = `${entityFileName}.blueprint.ts`;
    const outputPath = path.join(OUTPUT_DIR, outputFileName);

    // 2. Check if file exists and warn if it has content before overwriting
    try {
        const existingContent = await fs.readFile(outputPath, 'utf-8');
        let overwriteMessage = `⚠️ The file "${outputFileName}" already exists. Do you want to overwrite it?`;

        if (trim(existingContent).length > 0) {
            overwriteMessage = `🔥🔥🔥 DANGER: The file "${outputFileName}" is not empty and may contain custom code. Overwriting will delete all changes. Are you absolutely sure?`;
        }

        const { overwrite } = await inquirer.prompt<{ overwrite: boolean }>([
            {
                type: 'confirm',
                name: 'overwrite',
                message: overwriteMessage,
                default: false,
            },
        ]);

        if (!overwrite) {
            console.log('🚫 Operation cancelled. Exiting.');
            return;
        }
    } catch {
        // File does not exist, which is the normal case.
    }

    // 3. Render the template
    console.log('📝 Rendering template...');
    const templateContent = await fs.readFile(TEMPLATE_PATH, 'utf-8');
    const blueprintName = toUpper(snakeCase(modelName));

    const renderedContent = ejs.render(templateContent, {
        modelName,
        modulePath,
        entityFileName,
        blueprintName,
        fields,
        relations,
    });

    // 4. Write the new file
    await fs.writeFile(outputPath, renderedContent);

    console.log(`✨ Successfully generated blueprint: ${outputPath}`);
    console.log('🎉 --- Generation Complete --- 🎉');
};

// --- Run ---
main().catch((err) => {
    console.error('❌ An unexpected error occurred:', err);
    process.exit(1);
});
