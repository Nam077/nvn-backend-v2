import { forEach, reduce, startCase, get, set } from 'lodash';
import { Model } from 'sequelize-typescript';

import { ModelAttributes } from '../types/sequelize.types';

// --- UI-Driven Field Configuration ---

/**
 * Defines the settings for a field, which vary based on the UI component type.
 */
export interface FieldSettings {
    defaultValue?: any;
    listValues?: { title: string; value: any }[];

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

export interface BlueprintDefinition<T extends Model> {
    fields: {
        [K in keyof Partial<ModelAttributes<T>>]: UiFieldDefinition;
    };
    relations?: {
        [relationName: string]: RelationDefinition<any>;
    };
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

    private processedFields: Record<string, UiFieldDefinition> | null = null;

    private getProcessedFields(): Record<string, UiFieldDefinition> {
        if (this.processedFields) {
            return this.processedFields;
        }

        const allFields: Record<string, UiFieldDefinition> = {};

        // 1. Process direct fields using lodash.forEach
        forEach(get(this.definition, 'fields'), (field, key) => {
            set(allFields, key, {
                ...field,
                label: field.label ?? startCase(key),
            });
        });

        // 2. Process relation fields using lodash.forEach
        forEach(get(this.definition, 'relations'), (relationConfig, relationName) => {
            const targetInstance = new relationConfig.targetBlueprint();
            const targetFields = targetInstance.getProcessedFields();

            forEach(get(relationConfig, 'fields'), (field) => {
                const isOverride = typeof field === 'object';
                const fieldKey = isOverride ? get(field, 'name') : field;
                const baseFieldConfig = get(targetFields, fieldKey);

                if (baseFieldConfig) {
                    const newFieldKey = `${relationName}.${fieldKey}`;
                    set(allFields, newFieldKey, {
                        ...baseFieldConfig,
                        operators:
                            isOverride && get(field, 'operators')
                                ? get(field, 'operators')
                                : get(baseFieldConfig, 'operators'),
                        label: `${get(relationConfig, 'label')}: ${get(baseFieldConfig, 'label')}`,
                        fieldSettings: {
                            ...get(baseFieldConfig, 'fieldSettings'),
                            relation: {
                                name: relationName,
                                label: get(relationConfig, 'label'),
                            },
                        },
                    });
                }
            });
        });

        this.processedFields = allFields;
        return this.processedFields;
    }

    toJSON() {
        const fields = this.getProcessedFields();

        // Use lodash.reduce to build sortable and selectable fields
        const { sortableFields, selectableFields } = reduce(
            fields,
            (acc, field, key) => {
                if (get(field, 'sortable')) {
                    acc.sortableFields.push(key);
                }
                if (get(field, 'selectable') !== false) {
                    acc.selectableFields.push(key);
                }
                return acc;
            },
            { sortableFields: [], selectableFields: [] } as {
                sortableFields: string[];
                selectableFields: string[];
            },
        );

        return {
            name: this.name,
            fields,
            sortableFields,
            selectableFields,
            generatedAt: new Date().toISOString(),
        };
    }
}
