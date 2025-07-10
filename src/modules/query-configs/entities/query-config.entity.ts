import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    IsUUID,
    Default,
    ForeignKey,
    BelongsTo,
} from 'sequelize-typescript';

import { User } from '../../users/entities/user.entity';

@Table({
    tableName: 'nvn_query_configs',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['key', 'userId'],
            name: 'query_configs_key_userId_unique_idx',
        },
    ],
})
export class QueryConfig extends Model<QueryConfig> {
    @IsUUID(4)
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column({
        type: DataType.UUID,
        allowNull: false,
        field: 'id',
    })
    declare id: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        comment: 'The unique key for the configuration, e.g., FONT_MANAGEMENT_VIEW.',
        field: 'key',
    })
    declare key: string;

    @Column({
        type: DataType.JSONB,
        allowNull: false,
        comment: 'The JSON value of the configuration object.',
        field: 'value',
    })
    declare value: Record<string, any>;

    @ForeignKey(() => User)
    @Column({
        type: DataType.UUID,
        allowNull: true, // Null for system default configurations
        comment: 'The user who owns this custom configuration. Null for system defaults.',
        field: 'userId',
    })
    declare userId: string | null;

    @BelongsTo(() => User)
    declare user: User;
}
