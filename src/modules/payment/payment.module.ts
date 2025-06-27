import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { ConfigModule } from '@/modules/config/config.module';
import { PaymentController } from '@/modules/payment/payment.controller';
import { PaymentService } from '@/modules/payment/payment.service';
import { VietQrService } from '@/modules/payment/services/vietqr.service';

@Module({
    imports: [ConfigModule, HttpModule],
    controllers: [PaymentController],
    providers: [PaymentService, VietQrService],
    exports: [PaymentService, VietQrService],
})
export class PaymentModule {}
