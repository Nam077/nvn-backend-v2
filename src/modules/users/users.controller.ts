import { Body, Controller, Delete, Get, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AUTH_TYPE } from '@/common/constants/auth.constants';
import { ApiEndpoint } from '@/common/decorators/api-endpoint.decorator';
import { IApiResponse } from '@/common/dto/api.response.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { QueryDto } from '@/common/dto/query.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/auth.guard';
import { CheckAbilities } from '@/modules/casl/decorators/check-abilities.decorator';
import { CaslGuard } from '@/modules/casl/guards/casl.guard';
import { CreateUserDto } from '@/modules/users/dto/create-user.dto';
import { UpdateUserDto } from '@/modules/users/dto/update-user.dto';
import { UserResponseDto } from '@/modules/users/dto/user.response.dto';
import { User } from '@/modules/users/entities/user.entity';
import { UsersService } from '@/modules/users/users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Post()
    @ApiEndpoint({
        summary: 'Create a new user',
        created: true,
        response: UserResponseDto,
        errors: [HttpStatus.CONFLICT, HttpStatus.BAD_REQUEST],
    })
    async create(@Body() createUserDto: CreateUserDto): Promise<IApiResponse<UserResponseDto>> {
        return this.usersService.createApi(createUserDto);
    }

    @Post('query')
    @UseGuards(JwtAuthGuard, CaslGuard)
    @CheckAbilities({ action: 'read', subject: User })
    @ApiEndpoint({
        summary: 'Query users with pagination',
        response: UserResponseDto,
        auth: { type: [AUTH_TYPE.JWT] },
        errors: [HttpStatus.BAD_REQUEST],
        // Note: For a true paginated response, this should use paginationType: OFFSET
    })
    async query(@Query() paginationDto: PaginationDto, @Body() queryDto: QueryDto) {
        return this.usersService.findAllApi(paginationDto, queryDto);
    }

    @Get(':id')
    @UseGuards(CaslGuard)
    @CheckAbilities({ action: 'read', subject: User })
    @ApiEndpoint({
        summary: 'Get user by ID',
        response: UserResponseDto,
        auth: { type: [AUTH_TYPE.JWT] },
        errors: [HttpStatus.NOT_FOUND],
    })
    async findOne(@Param('id') id: string): Promise<IApiResponse<UserResponseDto>> {
        return this.usersService.findOneApi(id);
    }

    @Patch(':id')
    @UseGuards(CaslGuard)
    @CheckAbilities({ action: 'update', subject: User })
    @ApiEndpoint({
        summary: 'Update user by ID',
        response: UserResponseDto,
        auth: { type: [AUTH_TYPE.JWT] },
        errors: [HttpStatus.NOT_FOUND, HttpStatus.CONFLICT, HttpStatus.BAD_REQUEST],
    })
    async update(
        @Param('id') id: string,
        @Body() updateUserDto: UpdateUserDto,
    ): Promise<IApiResponse<UserResponseDto>> {
        return this.usersService.updateApi(id, updateUserDto);
    }

    @Delete(':id')
    @UseGuards(CaslGuard)
    @CheckAbilities({ action: 'delete', subject: User })
    @ApiEndpoint({
        summary: 'Delete a user',
        response: null,
        auth: { type: [AUTH_TYPE.JWT] },
        errors: [HttpStatus.NOT_FOUND],
    })
    async delete(@Param('id') id: string): Promise<IApiResponse<null>> {
        return this.usersService.removeApi(id);
    }
}
