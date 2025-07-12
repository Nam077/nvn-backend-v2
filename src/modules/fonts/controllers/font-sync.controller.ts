import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { FontSyncService } from '../services/font-sync.service';

@ApiTags('Fonts')
@Controller('fonts')
export class FontSyncController {
    constructor(private readonly fontSyncService: FontSyncService) {}

    @Post('sync')
    @HttpCode(HttpStatus.ACCEPTED)
    @ApiOperation({
        summary: 'Manually trigger a full synchronization of the font search index.',
    })
    @ApiResponse({
        status: 202,
        description: 'Synchronization process has been accepted and is running in the background.',
        schema: {
            type: 'object',
            properties: {
                message: {
                    type: 'string',
                    example: 'Full font synchronization task has been successfully queued.',
                },
                taskId: {
                    type: 'string',
                    format: 'uuid',
                    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
                },
            },
        },
    })
    @ApiResponse({
        status: 500,
        description: 'Internal server error if the task could not be queued.',
    })
    async triggerFullSync() {
        return this.fontSyncService.syncAllFonts();
    }
}
