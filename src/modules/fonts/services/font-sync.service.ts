import { Injectable, Logger } from '@nestjs/common';

import { QueueService } from '@/modules/queue/services/queue.service';

@Injectable()
export class FontSyncService {
    private readonly logger = new Logger(FontSyncService.name);

    constructor(private readonly queueService: QueueService) {}

    async syncAllFonts(): Promise<{
        message: string;
        taskId: string;
    }> {
        this.logger.log('Delegating full font synchronization to QueueService...');
        return this.queueService.queueFullResync();
    }
}
