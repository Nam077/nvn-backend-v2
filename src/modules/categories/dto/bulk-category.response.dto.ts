import { ApiProperty } from '@nestjs/swagger';

export class BulkCategoryResponseDto {
    @ApiProperty({
        description: 'The unique identifier of the created category.',
        example: '123e4567-e89b-12d3-a456-426614174000',
        format: 'uuid',
    })
    id: string;
}
