import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { WiFiAccountsService } from '../wifi-accounts/wifi-accounts.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { DurationType, BandwidthProfile } from '../entities/wifi-account.entity';

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

    return savedPayment;
  }

  async completePayment(paymentId: string, transactionId?: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['wifiAccount'],
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    payment.status = PaymentStatus.COMPLETED;
    if (transactionId) {
      payment.transactionId = transactionId;
    }

    const savedPayment = await this.paymentRepository.save(payment);

    // If payment doesn't have a WiFi account, create one automatically
    if (!payment.wifiAccountId && payment.status === PaymentStatus.COMPLETED) {
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

  async findAll(): Promise<Payment[]> {
    return await this.paymentRepository.find({
      relations: ['wifiAccount', 'createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Payment> {
    return await this.paymentRepository.findOne({
      where: { id },
      relations: ['wifiAccount', 'createdBy'],
    });
  }

  async findByTransactionId(transactionId: string): Promise<Payment> {
    return await this.paymentRepository.findOne({
      where: { transactionId },
      relations: ['wifiAccount', 'createdBy'],
    });
  }

  async updateStatus(id: string, status: PaymentStatus): Promise<Payment> {
    const payment = await this.findOne(id);
    if (!payment) {
      throw new Error('Payment not found');
    }

    payment.status = status;
    return await this.paymentRepository.save(payment);
  }
}

