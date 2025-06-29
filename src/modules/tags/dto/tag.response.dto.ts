import { ApiProperty } from '@nestjs/swagger';

import { Exclude, Expose, plainToInstance } from 'class-transformer';
import { assign } from 'lodash';

@Exclude()
export class TagResponseDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    name: string;

    @Expose()
    @ApiProperty()
    slug: string;

    constructor(partial: any) {
        assign(this, plainToInstance(TagResponseDto, partial, { excludeExtraneousValues: true }));
    }
}
