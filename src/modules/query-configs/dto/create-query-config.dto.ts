import { ApiProperty } from '@nestjs/swagger';

import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class CreateQueryConfigDto {
    @ApiProperty({
        example: 'FONT_MANAGEMENT_VIEW',
        description: 'The key identifying the configuration.',
    })
    @IsString()
    @IsNotEmpty()
    key: string;

    @ApiProperty({
        type: 'object',
        example: { fields: { name: { type: 'text' } } },
        description: 'The JSON value of the configuration.',
        additionalProperties: true,
    })
    @IsObject()
    @IsNotEmpty()
    value: Record<string, any>;
}
