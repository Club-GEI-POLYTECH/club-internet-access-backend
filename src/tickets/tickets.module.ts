import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TicketsService } from './tickets.service';
import { TicketTypesService } from './ticket-types.service';
import { TicketsWebhookService } from './tickets-webhook.service';
import { TicketsController } from './tickets.controller';
import { TicketsAdminController } from './tickets-admin.controller';
import { Payment } from '../entities/payment.entity';
import { Ticket } from '../entities/ticket.entity';
import { TicketType } from '../entities/ticket-type.entity';
import { PaymentModule } from '../payment/payment.module';
import { TicketsPaymentWebhookGuard } from './guards/tickets-payment-webhook.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ticket, TicketType, Payment]),
    forwardRef(() => PaymentModule),
  ],
  providers: [TicketsService, TicketTypesService, TicketsWebhookService, TicketsPaymentWebhookGuard],
  controllers: [TicketsController, TicketsAdminController],
  exports: [TicketsService, TicketTypesService, TicketsWebhookService],
})
export class TicketsModule {}
