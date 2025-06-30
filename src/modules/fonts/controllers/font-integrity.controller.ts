import { Controller, Post, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { FontIntegrityService } from '../services/font-integrity.service';

@ApiTags('Fonts - Integrity')
@Controller('fonts/integrity')
export class FontIntegrityController {
    constructor(private readonly fontIntegrityService: FontIntegrityService) {}

    @Get('status')
    @ApiOperation({
        summary: 'Check the synchronization status of the font search index',
        description:
            'Returns the number of active fonts that are missing from the search index and whether a sync job is currently running.',
    })
    @ApiResponse({
        status: 200,
        description: 'The current synchronization status.',
        schema: {
            type: 'object',
            properties: {
                isRunning: { type: 'boolean' },
                mismatchCount: { type: 'number' },
                status: { type: 'string' },
            },
        },
    })
    async getStatus() {
        const { isRunning, mismatchCount } = await this.fontIntegrityService.getSyncStatus();
        return {
            isRunning,
            mismatchCount,
            status: mismatchCount === 0 ? 'SYNCHRONIZED' : 'MISMATCH_FOUND',
        };
    }

    @Post('run')
    @HttpCode(HttpStatus.ACCEPTED)
    @ApiOperation({
        summary: 'Manually trigger the full font search index synchronization',
        description:
            'Asynchronously starts the job to re-synchronize all active fonts. The job runs in the background.',
    })
    @ApiResponse({ status: 202, description: 'The synchronization job has been successfully triggered.' })
    @ApiResponse({ status: 409, description: 'A synchronization job is already in progress.' })
    triggerSync(): { message: string } {
        // Don't await this, let it run in the background
        void this.fontIntegrityService.runFullSynchronization();
        return { message: 'The font search index synchronization job has been triggered.' };
    }
}
