import { Controller, Get, Post, Body, Param, Delete, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

import { IApiResponse } from '@/common/dto/api.response.dto';
import { GetUser } from '@/modules/auth/decorators/get-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { User } from '@/modules/users/entities/user.entity';

import { CreateQueryConfigDto } from '../dto/create-query-config.dto';
import { QueryConfigResponseDto } from '../dto/query-config.response.dto';
import { UpdateQueryConfigDto } from '../dto/update-query-config.dto';
import { QueryConfigsService } from '../services/query-configs.service';

@ApiTags('Query Configurations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('query-configs')
export class QueryConfigsController {
    constructor(private readonly queryConfigsService: QueryConfigsService) {}

    @Post()
    @ApiOperation({ summary: 'Create a new query configuration for the current user' })
    @ApiResponse({
        status: 201,
        description: 'The configuration has been successfully created.',
        type: QueryConfigResponseDto,
    })
    @ApiResponse({ status: 409, description: 'A configuration with this key already exists for the user.' })
    create(
        @Body() createQueryConfigDto: CreateQueryConfigDto,
        @GetUser() user: User,
    ): Promise<IApiResponse<QueryConfigResponseDto>> {
        return this.queryConfigsService.createApi(createQueryConfigDto, user);
    }

    @Get('/key/:key')
    @ApiOperation({ summary: 'Find a query configuration by key for the current user (falls back to default)' })
    @ApiResponse({ status: 200, description: 'The configuration object.', type: QueryConfigResponseDto })
    @ApiResponse({ status: 404, description: 'Configuration not found.' })
    @ApiParam({ name: 'key', description: 'The key of the configuration to retrieve' })
    async findByKeyForUser(
        @Param('key') key: string,
        @GetUser() user: User,
    ): Promise<IApiResponse<QueryConfigResponseDto>> {
        const config = await this.queryConfigsService.findByKeyForUser(key, user.id);
        return {
            statusCode: 200,
            message: 'Configuration retrieved successfully.',
            data: new QueryConfigResponseDto(config),
        };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Find a query configuration by its ID' })
    @ApiResponse({ status: 200, description: 'The configuration object.', type: QueryConfigResponseDto })
    @ApiResponse({ status: 404, description: 'Configuration not found.' })
    findOne(@Param('id') id: string): Promise<IApiResponse<QueryConfigResponseDto>> {
        return this.queryConfigsService.findOneApi(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a query configuration' })
    @ApiResponse({
        status: 200,
        description: 'The configuration has been successfully updated.',
        type: QueryConfigResponseDto,
    })
    @ApiResponse({ status: 404, description: 'Configuration not found.' })
    update(
        @Param('id') id: string,
        @Body() updateQueryConfigDto: UpdateQueryConfigDto,
    ): Promise<IApiResponse<QueryConfigResponseDto>> {
        return this.queryConfigsService.updateApi(id, updateQueryConfigDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a query configuration' })
    @ApiResponse({ status: 200, description: 'The configuration has been successfully deleted.' })
    @ApiResponse({ status: 404, description: 'Configuration not found.' })
    remove(@Param('id') id: string): Promise<IApiResponse<null>> {
        return this.queryConfigsService.removeApi(id);
    }
}
