import { assign, get, startCase } from 'lodash';
import { Model, ModelCtor } from 'sequelize-typescript';

import { ModelAttributes } from '../types/sequelize.types';

// --- UI-Driven Field Configuration ---

/**
 * Defines the settings for a field, which vary based on the UI component type.
 */
export interface FieldSettings {
    defaultValue?: any;
    listValues?: any[];
    listValuesType?: 'primitive' | 'object';
    valueKey?: string;

    // For 'remote_select' or 'remote_multiselect'
    remoteValues?: {
        path: string;
        titleField: string;
        valueField: string;
    };

    // For 'date' or 'datetime'
    dateFormat?: string;
    valueFormat?: string;

    // For 'text' or 'number'
    min?: number;
    max?: number;
    regex?: string;

    // A catch-all for any other properties
    [key: string]: any;
}

/**
 * The full definition for a single field, geared towards driving UI.
 */
export interface UiFieldDefinition {
    type:
        | 'text'
        | 'number'
        | 'date'
        | 'datetime'
        | 'select'
        | 'multiselect'
        | 'remote_select'
        | 'remote_multiselect'
        | 'boolean';
    label?: string;
    operators: string[];
    sortable?: boolean;
    selectable?: boolean;
    fieldSettings?: FieldSettings;
    remoteValues?: { blueprint: string; valueField: string; labelField: string };
}

// --- Blueprint Definition ---
export type RelationField<R extends Model> =
    | keyof ModelAttributes<R>
    | {
          name: keyof ModelAttributes<R>;
          operators?: string[];
      };

export interface RelationDefinition<R extends Model> {
    label: string;
    targetBlueprint: new () => QueryBlueprint<R>;
    fields: RelationField<R>[];
}

export type BlueprintFields<T extends Model> = {
    [key in keyof Partial<T['_attributes']>]: UiFieldDefinition;
};

export interface BlueprintDefinition<T extends Model> {
    model: ModelCtor<T>;
    fields: BlueprintFields<T>;
    customFields?: {
        [fieldName: string]: Partial<Omit<UiFieldDefinition, 'defaultValue'>>;
    };
    relations?: {
        [relationName: string]: {
            model: ModelCtor<any>;
            fields: { [fieldName: string]: Partial<Omit<UiFieldDefinition, 'defaultValue'>> };
        };
    };
    selectableFields: (keyof T['_attributes'] | string)[];
    sortableFields: (keyof T['_attributes'] | string)[];
    defaultSort?: { field: keyof T; direction: 1 | -1 }[];
}

/**
 * QueryBlueprint is a base class for creating declarative, type-safe query configurations.
 * It uses a fluent API (builder pattern) to define which fields of a model are queryable,
 * what operators they support, and how they relate to other models.
 *
 * The `toJSON` method allows these configurations to be serialized into a JSON format,
 * which can be consumed by a frontend UI builder or a backend validation engine.
 */
export abstract class QueryBlueprint<T extends Model> {
    /**
     * A unique name for this blueprint, used for identification.
     * e.g., 'USER_MANAGEMENT', 'FONT_SEARCH'
     */
    abstract readonly name: string;
    protected abstract readonly definition: BlueprintDefinition<T>;

    // eslint-disable-next-line sonarjs/cognitive-complexity
    private getProcessedFields(): Record<string, UiFieldDefinition> {
        const flatFields: Record<string, UiFieldDefinition> = {};

        // 1. Process direct model fields
        for (const fieldName in get(this.definition, 'fields')) {
            if (Object.prototype.hasOwnProperty.call(this.definition.fields, fieldName)) {
                const config = get(get(this.definition, 'fields'), fieldName);
                assign(flatFields, {
                    [fieldName]: {
                        ...config,
                        label: get(config, 'label') ?? startCase(fieldName),
                    },
                });
            }
        }

        // 2. Process custom fields (not directly on the model)
        for (const fieldName in this.definition.customFields) {
            if (Object.prototype.hasOwnProperty.call(this.definition.customFields, fieldName)) {
                const config = get(this.definition.customFields, fieldName);
                assign(flatFields, {
                    [fieldName]: {
                        type: 'text', // Default type
                        operators: [],
                        ...config,
                        label: get(config, 'label') ?? startCase(fieldName),
                    },
                });
            }
        }

        // 3. Process relational fields - create flat keys
        for (const relationName in this.definition.relations) {
            if (Object.prototype.hasOwnProperty.call(this.definition.relations, relationName)) {
                const relation = get(this.definition.relations, relationName);
                for (const fieldName in relation.fields) {
                    if (Object.prototype.hasOwnProperty.call(relation.fields, fieldName)) {
                        const config = get(relation.fields, fieldName);
                        const flatFieldName = `${relationName}.${fieldName}`;
                        assign(flatFields, {
                            [flatFieldName]: {
                                type: 'text', // Default type for relation fields
                                operators: [],
                                ...config,
                                label: get(config, 'label') ?? `${startCase(relationName)}: ${startCase(fieldName)}`,
                            },
                        });
                    }
                }
            }
        }

        return flatFields;
    }

    toJSON() {
        return {
            name: this.name,
            fields: this.getProcessedFields(),
            sortableFields: get(this.definition, 'sortableFields'),
            selectableFields: get(this.definition, 'selectableFields'),
            defaultSort: get(this.definition, 'defaultSort'),
            generatedAt: new Date().toISOString(),
        };
    }
}
