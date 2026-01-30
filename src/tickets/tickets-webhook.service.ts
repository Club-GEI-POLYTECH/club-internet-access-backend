import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketsService } from './tickets.service';
import { Payment, PaymentStatus } from '../entities/payment.entity';

/**
 * Service pour gérer les webhooks de paiement et mettre à jour les tickets
 */
@Injectable()
export class TicketsWebhookService {
  private readonly logger = new Logger(TicketsWebhookService.name);

  constructor(
    private ticketsService: TicketsService,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
  ) {}

  /**
   * Appelé quand un paiement est complété
   */
  async handlePaymentCompleted(paymentId: string): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['ticket'],
    });

    if (!payment) {
      this.logger.warn(`Payment ${paymentId} not found`);
      return;
    }

    if (payment.ticketId && payment.status === PaymentStatus.COMPLETED) {
      try {
        await this.ticketsService.markAsSold(
          payment.ticketId,
          payment.phoneNumber || '',
        );
        this.logger.log(`✅ Ticket ${payment.ticketId} marked as sold after payment completion`);
      } catch (error) {
        this.logger.error(`❌ Failed to mark ticket as sold: ${error.message}`);
      }
    }
  }

  /**
   * Appelé quand un paiement échoue
   */
  async handlePaymentFailed(paymentId: string): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['ticket'],
    });

    if (!payment) {
      this.logger.warn(`Payment ${paymentId} not found`);
      return;
    }

    if (payment.ticketId && payment.status === PaymentStatus.FAILED) {
      try {
        await this.ticketsService.markAsFailed(payment.ticketId);
        this.logger.log(`✅ Ticket ${payment.ticketId} released after payment failure`);
      } catch (error) {
        this.logger.error(`❌ Failed to release ticket: ${error.message}`);
      }
    }
  }

  /**
   * Traite un webhook de paiement
   */
  async handlePaymentWebhook(paymentId: string, status: PaymentStatus): Promise<void> {
    this.logger.log(`handlePaymentWebhook paymentId=${paymentId} status=${status}`);
    if (status === PaymentStatus.COMPLETED) {
      await this.handlePaymentCompleted(paymentId);
    } else if (status === PaymentStatus.FAILED) {
      await this.handlePaymentFailed(paymentId);
    }
  }
}
