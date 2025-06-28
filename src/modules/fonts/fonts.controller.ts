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
import { ApiParam, ApiTags } from '@nestjs/swagger';

import { AUTH_TYPE } from '@/common/constants/auth.constants';
import { PAGINATION_TYPE } from '@/common/constants/pagination.constants';
import { ApiEndpoint } from '@/common/decorators/api-endpoint.decorator';
import { IApiResponse } from '@/common/dto/api.response.dto';
import { IApiCursorPaginatedResponse, IApiPaginatedResponse } from '@/common/dto/paginated.response.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { QueryDto } from '@/common/dto/query.dto';
import { CaslGuard } from '@/modules/casl/guards/casl.guard';

import { CreateFontDto } from './dto/create-font.dto';
import { FontResponseDto } from './dto/font.response.dto';
import { QueryFontsCursorDto } from './dto/query-fonts-cursor.dto';
import { UpdateFontDto } from './dto/update-font.dto';
import { FontsService } from './fonts.service';

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
        return this.fontsService.create(createFontDto);
    }

    @Post('query')
    @ApiEndpoint({
        summary: 'Query fonts with pagination',
        description: 'Retrieves fonts based on a JSON logic query with offset-based pagination.',
        response: FontResponseDto,
        paginationType: PAGINATION_TYPE.OFFSET,
        errors: [HttpStatus.BAD_REQUEST],
    })
    async query(
        @Query(ValidationPipe) paginationDto: PaginationDto,
        @Body(ValidationPipe) queryDto: QueryDto,
    ): Promise<IApiPaginatedResponse<FontResponseDto>> {
        return this.fontsService.query(paginationDto, queryDto);
    }

    @Post('query-cursor')
    @ApiEndpoint({
        summary: 'Query fonts with cursor pagination',
        description: 'Retrieves fonts based on a JSON logic query with cursor-based pagination.',
        response: FontResponseDto,
        paginationType: PAGINATION_TYPE.CURSOR,
        errors: [HttpStatus.BAD_REQUEST],
    })
    async queryWithCursor(
        @Body() queryFontsCursorDto: QueryFontsCursorDto,
    ): Promise<IApiCursorPaginatedResponse<FontResponseDto>> {
        return this.fontsService.queryWithCursor(queryFontsCursorDto);
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
        return this.fontsService.findOne(id);
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
        return this.fontsService.update(id, updateFontDto);
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
        return this.fontsService.remove(id);
    }
}
