import { Injectable, Logger } from '@nestjs/common';
import { PaymentService } from '../../payment/payment.service';
import { PaymentMessage } from '../interfaces/kafka-message.interface';
import { PaymentStatus, PaymentMethod } from '../../entities/payment.entity';

@Injectable()
export class PaymentConsumer {
  private readonly logger = new Logger(PaymentConsumer.name);

  constructor(private paymentService: PaymentService) {}

  async handleMessage(message: PaymentMessage): Promise<void> {
    this.logger.log(`📥 Received payment event: ${message.event}`);

    try {
      switch (message.event) {
        case 'payment.created':
          await this.handlePaymentCreated(message);
          break;
        case 'payment.completed':
          await this.handlePaymentCompleted(message);
          break;
        case 'payment.failed':
          await this.handlePaymentFailed(message);
          break;
        case 'payment.cancelled':
          await this.handlePaymentCancelled(message);
          break;
        default:
          this.logger.warn(`⚠️ Unknown payment event: ${message.event}`);
      }
    } catch (error) {
      this.logger.error(`❌ Error handling payment message: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handlePaymentCreated(message: PaymentMessage): Promise<void> {
    const { data } = message;

    // Si le paiement existe déjà (par ID), on le met à jour
    if (data.id) {
      try {
        const existingPayment = await this.paymentService.findOne(data.id);
        if (existingPayment) {
          this.logger.log(`ℹ️ Payment ${data.id} already exists, skipping creation`);
          return;
        }
      } catch (error) {
        // Le paiement n'existe pas, on continue avec la création
      }
    }

    // Créer un nouveau paiement
    const payment = await this.paymentService.create(
      {
        amount: data.amount,
        method: data.method as PaymentMethod,
        phoneNumber: data.phoneNumber,
        wifiAccountId: data.wifiAccountId,
        notes: data.notes,
      },
      data.userId,
    );

    this.logger.log(`✅ Payment created from Kafka: ${payment.id}`);
  }

  private async handlePaymentCompleted(message: PaymentMessage): Promise<void> {
    const { data } = message;

    if (!data.id && !data.transactionId) {
      this.logger.warn('⚠️ Payment ID or transactionId required for completion');
      return;
    }

    let payment;
    if (data.id) {
      payment = await this.paymentService.findOne(data.id);
    } else if (data.transactionId) {
      payment = await this.paymentService.findByTransactionId(data.transactionId);
    }

    if (!payment) {
      this.logger.warn(`⚠️ Payment not found: ${data.id || data.transactionId}`);
      return;
    }

    // Compléter le paiement (cela créera automatiquement un compte Wi-Fi si nécessaire)
    await this.paymentService.completePayment(payment.id, data.transactionId);
    this.logger.log(`✅ Payment completed from Kafka: ${payment.id}`);
  }

  private async handlePaymentFailed(message: PaymentMessage): Promise<void> {
    const { data } = message;

    if (!data.id && !data.transactionId) {
      this.logger.warn('⚠️ Payment ID or transactionId required for failure');
      return;
    }

    let payment;
    if (data.id) {
      payment = await this.paymentService.findOne(data.id);
    } else if (data.transactionId) {
      payment = await this.paymentService.findByTransactionId(data.transactionId);
    }

    if (!payment) {
      this.logger.warn(`⚠️ Payment not found: ${data.id || data.transactionId}`);
      return;
    }

    await this.paymentService.updateStatus(payment.id, PaymentStatus.FAILED);
    this.logger.log(`✅ Payment marked as failed from Kafka: ${payment.id}`);
  }

  private async handlePaymentCancelled(message: PaymentMessage): Promise<void> {
    const { data } = message;

    if (!data.id && !data.transactionId) {
      this.logger.warn('⚠️ Payment ID or transactionId required for cancellation');
      return;
    }

    let payment;
    if (data.id) {
      payment = await this.paymentService.findOne(data.id);
    } else if (data.transactionId) {
      payment = await this.paymentService.findByTransactionId(data.transactionId);
    }

    if (!payment) {
      this.logger.warn(`⚠️ Payment not found: ${data.id || data.transactionId}`);
      return;
    }

    await this.paymentService.updateStatus(payment.id, PaymentStatus.CANCELLED);
    this.logger.log(`✅ Payment marked as cancelled from Kafka: ${payment.id}`);
  }
}
