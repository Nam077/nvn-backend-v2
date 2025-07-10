import { ApiProperty } from '@nestjs/swagger';

export class MockDataResponseDto {
    @ApiProperty({
        description: 'A summary message of the operation.',
        example: 'Successfully generated 100 mock categories.',
    })
    message: string;

    @ApiProperty({
        description: 'The path to the generated file.',
        example: 'public/mock-categories.json',
    })
    filePath: string;
}
