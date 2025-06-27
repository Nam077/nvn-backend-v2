import { BlueprintDefinition, QueryBlueprint } from '@/common/query-builder/query-blueprint.base';
import { Download } from '@/modules/analytics/entities/download.entity';

export class DownloadQueryBlueprint extends QueryBlueprint<Download> {
    readonly name = 'DOWNLOAD_MANAGEMENT';

    protected readonly definition: BlueprintDefinition<Download> = {
        model: Download,
        fields: {
            // TODO: Add fields from Download that you want to query
            // Example:
            // name: {
            //     type: 'text',
            //     operators: [STRING_OPERATORS.CONTAINS],
            // },
        },
        // TODO: Define which fields from the model and its relations can be selected
        selectableFields: ['id', 'createdAt'],

        // TODO: Define which fields can be used for sorting
        sortableFields: ['createdAt'],

        // TODO: Define the default sort order
        defaultSort: [['createdAt', 'DESC']],

        // TODO: (Optional) Define relations to other models
        // relations: {
        //     relationName: {
        //         model: OtherModel,
        //         fields: {
        //             fieldName: { operators: [STRING_OPERATORS.EQUALS] },
        //         }
        //     }
        // }
    };
}
