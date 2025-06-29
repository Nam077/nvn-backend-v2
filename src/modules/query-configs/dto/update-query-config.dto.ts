import { ApiProperty } from '@nestjs/swagger';

import { IsNotEmpty, IsObject } from 'class-validator';

export class UpdateQueryConfigDto {
    @ApiProperty({
        type: 'object',
        example: { fields: { name: { type: 'text', label: 'Font Name' } } },
        description: 'The updated JSON value of the configuration.',
        additionalProperties: true,
    })
    @IsObject()
    @IsNotEmpty()
    value: Record<string, any>;
}
