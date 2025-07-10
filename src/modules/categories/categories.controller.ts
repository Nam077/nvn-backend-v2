import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AUTH_TYPE } from '@/common/constants/auth.constants';
import { PAGINATION_TYPE } from '@/common/constants/pagination.constants';
import { ApiEndpoint } from '@/common/decorators/api-endpoint.decorator';
import { IApiResponse } from '@/common/dto/api.response.dto';
import { IApiPaginatedResponse } from '@/common/dto/paginated.response.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { QueryDto } from '@/common/dto/query.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { CaslGuard } from '@/modules/casl/guards/casl.guard';

import { CategoriesService } from './categories.service';
import { BulkCategoryResponseDto } from './dto/bulk-category.response.dto';
import { BulkCreateCategoryDto } from './dto/bulk-create-category.dto';
import { CategoryResponseDto } from './dto/category.response.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { MockDataResponseDto } from './dto/mock-data-response.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('Categories')
@Controller('categories')
@UseGuards(JwtAuthGuard, CaslGuard)
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) {}

    @Post()
    @ApiEndpoint({
        summary: 'Create a new category',
        created: true,
        response: CategoryResponseDto,
        auth: { type: [AUTH_TYPE.JWT] },
        errors: [HttpStatus.CONFLICT, HttpStatus.BAD_REQUEST],
    })
    create(@Body() createCategoryDto: CreateCategoryDto): Promise<IApiResponse<CategoryResponseDto>> {
        return this.categoriesService.createApi(createCategoryDto);
    }

    @Post('bulk')
    @ApiEndpoint({
        summary: 'Bulk create categories',
        description:
            'Creates multiple categories in a single request. Replicates the logic of the single create endpoint, including slug generation, duplicate checks, and path calculation for nested categories, but in an optimized manner.',
        created: true,
        response: BulkCategoryResponseDto,
        auth: { type: [AUTH_TYPE.JWT] },
        errors: [HttpStatus.CONFLICT, HttpStatus.NOT_FOUND, HttpStatus.BAD_REQUEST],
    })
    bulkCreate(@Body() bulkCreateCategoryDto: BulkCreateCategoryDto): Promise<IApiResponse<{ id: string }[]>> {
        return this.categoriesService.bulkCreateApi(bulkCreateCategoryDto.items);
    }

    @Get('generate-mock-data')
    @ApiEndpoint({
        summary: 'Generate mock data for categories',
        description:
            'Generates a JSON file with 100 mock categories, ready to be used with the bulk create endpoint. The file is saved to `public/mock-categories.json`.',
        response: MockDataResponseDto,
        auth: { type: [AUTH_TYPE.JWT] },
    })
    generateMockData(): Promise<IApiResponse<MockDataResponseDto>> {
        return this.categoriesService.generateMockDataApi();
    }

    @Post('query')
    @ApiEndpoint({
        summary: 'Query categories with pagination and filtering',
        response: CategoryResponseDto,
        auth: { type: [AUTH_TYPE.JWT] },
        errors: [HttpStatus.BAD_REQUEST],
        paginationType: PAGINATION_TYPE.OFFSET,
    })
    findAll(
        @Query() paginationDto: PaginationDto,
        @Body() queryDto: QueryDto,
    ): Promise<IApiPaginatedResponse<CategoryResponseDto>> {
        return this.categoriesService.findAllApi(paginationDto, queryDto);
    }

    // --- Tree Structure Endpoints (Must come before dynamic routes) ---

    @Get('tree')
    @ApiEndpoint({
        summary: 'Get category tree structure',
        description: 'Returns hierarchical category tree with configurable depth',
        response: CategoryResponseDto,
        auth: { type: [AUTH_TYPE.JWT] },
        errors: [HttpStatus.BAD_REQUEST],
    })
    findTree(@Query('maxDepth') maxDepth: number = 3): Promise<IApiResponse<CategoryResponseDto[]>> {
        return this.categoriesService.findAllTreeApi(maxDepth);
    }

    @Get('by-path/*')
    @ApiEndpoint({
        summary: 'Get category by materialized path',
        description: 'Find category using its path (e.g., "/typography/sans-serif")',
        response: CategoryResponseDto,
        auth: { type: [AUTH_TYPE.JWT] },
        errors: [HttpStatus.NOT_FOUND],
    })
    findByPath(@Param('0') path: string): Promise<IApiResponse<CategoryResponseDto>> {
        return this.categoriesService.findByPathApi(path);
    }

    // --- Dynamic Routes (Must come after static routes) ---

    @Get(':id')
    @ApiEndpoint({
        summary: 'Get a single category by ID',
        response: CategoryResponseDto,
        auth: { type: [AUTH_TYPE.JWT] },
        errors: [HttpStatus.NOT_FOUND],
    })
    findOne(@Param('id') id: string): Promise<IApiResponse<CategoryResponseDto>> {
        return this.categoriesService.findOneApi(id);
    }

    @Get(':id/children')
    @ApiEndpoint({
        summary: 'Get children tree of a category',
        description: 'Returns hierarchical children of specified category',
        response: CategoryResponseDto,
        auth: { type: [AUTH_TYPE.JWT] },
        errors: [HttpStatus.NOT_FOUND, HttpStatus.BAD_REQUEST],
    })
    findChildrenTree(
        @Param('id') id: string,
        @Query('maxDepth') maxDepth: number = 2,
    ): Promise<IApiResponse<CategoryResponseDto[]>> {
        return this.categoriesService.findChildrenTreeApi(id, maxDepth);
    }

    @Get(':id/ancestors')
    @ApiEndpoint({
        summary: 'Get ancestors of a category',
        description: 'Returns all parent categories up to root',
        response: CategoryResponseDto,
        auth: { type: [AUTH_TYPE.JWT] },
        errors: [HttpStatus.NOT_FOUND],
    })
    findAncestors(@Param('id') id: string): Promise<IApiResponse<CategoryResponseDto[]>> {
        return this.categoriesService.findAncestorsApi(id);
    }

    @Patch(':id')
    @ApiEndpoint({
        summary: 'Update a category',
        response: CategoryResponseDto,
        auth: { type: [AUTH_TYPE.JWT] },
        errors: [HttpStatus.NOT_FOUND, HttpStatus.CONFLICT, HttpStatus.BAD_REQUEST],
    })
    update(
        @Param('id') id: string,
        @Body() updateCategoryDto: UpdateCategoryDto,
    ): Promise<IApiResponse<CategoryResponseDto>> {
        return this.categoriesService.updateApi(id, updateCategoryDto);
    }

    @Delete(':id')
    @ApiEndpoint({
        summary: 'Delete a category',
        response: null,
        auth: { type: [AUTH_TYPE.JWT] },
        errors: [HttpStatus.NOT_FOUND],
    })
    remove(@Param('id') id: string): Promise<IApiResponse<null>> {
        return this.categoriesService.removeApi(id);
    }
}
