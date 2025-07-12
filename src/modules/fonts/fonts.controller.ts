import {
    Body,
    Controller,
    Delete,
    Get,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
    ValidationPipe,
} from '@nestjs/common';
import { ApiBody, ApiParam, ApiTags } from '@nestjs/swagger';

import { AUTH_TYPE } from '@/common/constants/auth.constants';
import { PAGINATION_TYPE } from '@/common/constants/pagination.constants';
import { ApiEndpoint } from '@/common/decorators/api-endpoint.decorator';
import { IApiResponse } from '@/common/dto/api.response.dto';
import { IApiPaginatedResponse } from '@/common/dto/paginated.response.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { createCustomQueryDto, QueryDto } from '@/common/dto/query.dto';
import { CaslGuard } from '@/modules/casl/guards/casl.guard';
import { ValidateQuery } from '@/modules/query-validation/decorators/validate-query.decorator';

import { BulkCreateFontDto } from './dto/bulk-create-font.dto';
import { BulkFontResponseDto } from './dto/bulk-font.response.dto';
import { CreateFontDto } from './dto/create-font.dto';
import { FontResponseDto } from './dto/font.response.dto';
import { UpdateFontDto } from './dto/update-font.dto';
import { FontsService } from './fonts.service';

const FontQueryDto = createCustomQueryDto({
    and: [{ '==': [{ var: 'family' }, 'some-font-family'] }],
});

@ApiTags('Fonts')
@Controller('fonts')
export class FontsController {
    constructor(private readonly fontsService: FontsService) {}

    @Post()
    @UseGuards(CaslGuard)
    @ApiEndpoint({
        summary: 'Create a new font',
        description: 'Creates a new font record.',
        response: FontResponseDto,
        created: true,
        auth: { type: [AUTH_TYPE.JWT] },
        errors: [HttpStatus.CONFLICT, HttpStatus.BAD_REQUEST],
    })
    async create(@Body(ValidationPipe) createFontDto: CreateFontDto): Promise<IApiResponse<FontResponseDto>> {
        return this.fontsService.createApi(createFontDto);
    }

    @Post('bulk')
    @ApiEndpoint({
        summary: 'Bulk create fonts',
        description:
            'Creates multiple fonts in a single, transactional request. Recommended for up to 1000 fonts at a time.',
        created: true,
        response: BulkFontResponseDto,
        auth: { type: [AUTH_TYPE.JWT] },
        errors: [HttpStatus.CONFLICT, HttpStatus.NOT_FOUND, HttpStatus.BAD_REQUEST],
    })
    async bulkCreate(@Body() bulkCreateFontDto: BulkCreateFontDto): Promise<IApiResponse<{ id: string }[]>> {
        return this.fontsService.bulkCreateApi(bulkCreateFontDto.items);
    }

    @Post('query')
    @ValidateQuery('FONT_MANAGEMENT')
    @ApiBody({ type: FontQueryDto })
    @ApiEndpoint({
        summary: 'Query fonts with pagination',
        description: 'Retrieves fonts based on a JSON logic query with offset-based pagination.',
        response: FontResponseDto,
        paginationType: PAGINATION_TYPE.OFFSET,
        errors: [HttpStatus.BAD_REQUEST],
    })
    async findAll(
        @Query(ValidationPipe) paginationDto: PaginationDto,
        @Body(ValidationPipe) queryDto: QueryDto,
    ): Promise<IApiPaginatedResponse<FontResponseDto>> {
        return this.fontsService.findAllApi(paginationDto, queryDto);
    }

    @Get(':id')
    @ApiEndpoint({
        summary: 'Get a font by ID',
        description: 'Retrieves a single font by its unique identifier.',
        response: FontResponseDto,
        errors: [HttpStatus.NOT_FOUND],
    })
    @ApiParam({ name: 'id', description: 'Font ID' })
    async findOne(@Param('id') id: string): Promise<IApiResponse<FontResponseDto>> {
        return this.fontsService.findOneApi(id);
    }

    @Patch(':id')
    @UseGuards(CaslGuard)
    @ApiEndpoint({
        summary: 'Update a font',
        description: 'Updates an existing font record.',
        response: FontResponseDto,
        auth: { type: [AUTH_TYPE.JWT] },
        errors: [HttpStatus.NOT_FOUND, HttpStatus.BAD_REQUEST],
    })
    @ApiParam({ name: 'id', description: 'Font ID' })
    async update(
        @Param('id') id: string,
        @Body(ValidationPipe) updateFontDto: UpdateFontDto,
    ): Promise<IApiResponse<FontResponseDto>> {
        return this.fontsService.updateApi(id, updateFontDto);
    }

    @Delete(':id')
    @UseGuards(CaslGuard)
    @ApiEndpoint({
        summary: 'Delete a font',
        description: 'Deletes a font record.',
        response: null,
        auth: { type: [AUTH_TYPE.JWT] },
        errors: [HttpStatus.NOT_FOUND],
    })
    @ApiParam({ name: 'id', description: 'Font ID' })
    async remove(@Param('id') id: string): Promise<IApiResponse<null>> {
        return this.fontsService.removeApi(id);
    }
}
