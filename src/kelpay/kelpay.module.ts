import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../entities/payment.entity';
import { KelpayApiClient } from './kelpay-api.client';
import { KelpayPaymentOrchestratorService } from './kelpay-payment-orchestrator.service';
import { KelpayPaymentsController } from './kelpay-payments.controller';
import { TicketsModule } from '../tickets/tickets.module';
import { KELPAY_HTTP_TIMEOUT_MS } from './kelpay.constants';

@Module({
  imports: [
    HttpModule.register({
      timeout: KELPAY_HTTP_TIMEOUT_MS,
      maxRedirects: 0,
    }),
    TypeOrmModule.forFeature([Payment]),
    forwardRef(() => TicketsModule),
  ],
  controllers: [KelpayPaymentsController],
  providers: [KelpayApiClient, KelpayPaymentOrchestratorService],
  exports: [KelpayPaymentOrchestratorService],
})
export class KelpayModule {}
