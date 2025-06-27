import { map, startCase } from 'lodash';

import {
    DATE_OPERATORS,
    ENUM_OPERATORS,
    NUMBER_OPERATORS,
    STRING_OPERATORS,
} from '@/common/query-builder/operators.constants';
import { BlueprintDefinition, QueryBlueprint } from '@/common/query-builder/query-blueprint.base';
import { FILE_STATUS, FILE_TYPE, File } from '@/modules/files/entities/file.entity';

export class FileQueryBlueprint extends QueryBlueprint<File> {
    readonly name = 'FILE_MANAGEMENT';

    protected readonly definition: BlueprintDefinition<File> = {
        model: File,
        fields: {
            originalName: {
                type: 'text',
                operators: [STRING_OPERATORS.CONTAINS, STRING_OPERATORS.EQUALS],
            },
            fileType: {
                type: 'select',
                operators: [ENUM_OPERATORS.IN, ENUM_OPERATORS.EQUALS],
                fieldSettings: {
                    listValues: map(FILE_TYPE, (v) => ({ title: startCase(v), value: v })),
                },
            },
            status: {
                type: 'select',
                operators: [ENUM_OPERATORS.IN, ENUM_OPERATORS.EQUALS],
                fieldSettings: {
                    listValues: map(FILE_STATUS, (v) => ({ title: startCase(v), value: v })),
                },
            },
            fileSize: {
                type: 'number',
                label: 'File Size (bytes)',
                operators: [NUMBER_OPERATORS.GTE, NUMBER_OPERATORS.LTE],
            },
            createdAt: {
                type: 'datetime',
                operators: [DATE_OPERATORS.BETWEEN, DATE_OPERATORS.GTE],
            },
        },
        selectableFields: ['id', 'originalName', 'fileType', 'status', 'fileSize', 'createdAt'],
        sortableFields: ['fileSize', 'createdAt'],
        defaultSort: [['createdAt', 'DESC']],
    };
}
