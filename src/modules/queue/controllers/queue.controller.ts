import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { QueueService } from '../services/queue.service';

@ApiTags('Queue')
@Controller('queue')
export class QueueController {
    constructor(private readonly queueService: QueueService) {}

    @Get('health')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Get the current health and statistics of the font update queue.',
    })
    @ApiResponse({
        status: 200,
        description: 'Returns the queue health statistics.',
        // You can define a DTO for this response for better type-safety
    })
    @ApiResponse({
        status: 500,
        description: 'Internal server error.',
    })
    getHealth() {
        return this.queueService.getQueueHealth();
    }
}
