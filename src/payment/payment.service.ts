import { Injectable, Logger, Optional, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { WiFiAccountsService } from '../wifi-accounts/wifi-accounts.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { DurationType, BandwidthProfile } from '../entities/wifi-account.entity';
import { UserRole } from '../entities/user.entity';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private wifiAccountsService: WiFiAccountsService,
  ) {}

  async create(createDto: CreatePaymentDto, createdById?: string): Promise<Payment> {
    const payment = this.paymentRepository.create({
      ...createDto,
      status: PaymentStatus.PENDING,
      createdById,
    });

    const savedPayment = await this.paymentRepository.save(payment);

    // If payment is for a WiFi account, link it
    if (createDto.wifiAccountId) {
      payment.wifiAccountId = createDto.wifiAccountId;
      await this.paymentRepository.save(payment);
    }

    // If payment is for a ticket, link it (ticketId is already in createDto)
    // The ticket linking is handled in TicketsService

    return savedPayment;
  }

  async completePayment(paymentId: string, transactionId?: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['wifiAccount', 'ticket'],
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    payment.status = PaymentStatus.COMPLETED;
    if (transactionId) {
      payment.transactionId = transactionId;
    }

    const savedPayment = await this.paymentRepository.save(payment);

    // If payment is for a ticket, mark ticket as sold
    // This will be handled by TicketsWebhookService
    if (payment.ticketId && payment.status === PaymentStatus.COMPLETED) {
      // Import dynamically to avoid circular dependency
      try {
        const { TicketsWebhookService } = await import('../tickets/tickets-webhook.service');
        // Note: In a real implementation, this would be injected via DI
        // For now, we'll handle it via a webhook endpoint or event emitter
        this.logger.log(`✅ Payment completed for ticket: ${payment.ticketId} - Ticket should be marked as sold`);
      } catch (error) {
        this.logger.warn(`Could not notify ticket webhook service: ${error.message}`);
      }
    }
    // If payment doesn't have a WiFi account or ticket, create WiFi account automatically
    else if (!payment.wifiAccountId && !payment.ticketId && payment.status === PaymentStatus.COMPLETED) {
      try {
        // Determine duration and bandwidth based on amount
        const { duration, bandwidthProfile } = this.calculateAccountFromAmount(payment.amount);

        const wifiAccount = await this.wifiAccountsService.create(
          {
            duration,
            bandwidthProfile,
            comment: `Auto-created from payment ${payment.id}`,
          },
          payment.createdById,
        );

        payment.wifiAccountId = wifiAccount.id;
        await this.paymentRepository.save(payment);

        this.logger.log(`✅ Auto-created WiFi account ${wifiAccount.username} from payment ${payment.id}`);
      } catch (error) {
        this.logger.error(`❌ Failed to auto-create WiFi account: ${error.message}`);
      }
    }

    return savedPayment;
  }

  // Note: TicketsService will be injected via forwardRef if needed
  // For now, we'll handle ticket completion via webhook or separate service call

  private calculateAccountFromAmount(amount: number): {
    duration: DurationType;
    bandwidthProfile: BandwidthProfile;
  } {
    // Pricing logic - adjust based on your needs
    if (amount >= 5000) {
      return { duration: DurationType.DAYS_30, bandwidthProfile: BandwidthProfile.PREMIUM_5MB };
    } else if (amount >= 2000) {
      return { duration: DurationType.DAYS_7, bandwidthProfile: BandwidthProfile.STANDARD_2MB };
    } else if (amount >= 1000) {
      return { duration: DurationType.HOURS_48, bandwidthProfile: BandwidthProfile.STANDARD_2MB };
    } else {
      return { duration: DurationType.HOURS_24, bandwidthProfile: BandwidthProfile.BASIC_1MB };
    }
  }

  async findAll(userId?: string, userRole?: UserRole): Promise<Payment[]> {
    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.wifiAccount', 'wifiAccount')
      .leftJoinAndSelect('payment.ticket', 'ticket')
      .leftJoinAndSelect('payment.createdBy', 'createdBy')
      .orderBy('payment.createdAt', 'DESC');
    
    // Les étudiants voient uniquement leurs propres paiements
    if (userRole === UserRole.STUDENT && userId) {
      queryBuilder.where('payment.createdById = :userId', { userId });
    }
    
    return await queryBuilder.getMany();
  }

  async findOne(id: string, userId?: string, userRole?: UserRole): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['wifiAccount', 'ticket', 'createdBy'],
    });
    
    // Les étudiants ne peuvent voir que leurs propres paiements
    if (payment && userRole === UserRole.STUDENT && userId) {
      if (payment.createdById !== userId) {
        throw new Error('Payment not found');
      }
    }
    
    return payment;
  }

  async findByTransactionId(transactionId: string): Promise<Payment> {
    return await this.paymentRepository.findOne({
      where: { transactionId },
      relations: ['wifiAccount', 'createdBy'],
    });
  }

  async updateStatus(id: string, status: PaymentStatus): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['ticket'],
    });
    
    if (!payment) {
      throw new Error('Payment not found');
    }

    payment.status = status;
    const savedPayment = await this.paymentRepository.save(payment);

    // If payment failed and is linked to a ticket, release the ticket
    if (status === PaymentStatus.FAILED && payment.ticketId) {
      this.logger.log(`⚠️ Payment failed for ticket: ${payment.ticketId} - Ticket should be released`);
      // The ticket release will be handled by TicketsService via webhook
    }

    return savedPayment;
  }
}

