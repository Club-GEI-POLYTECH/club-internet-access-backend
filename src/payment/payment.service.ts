import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentMethod, PaymentStatus } from '../entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';
import { UserRole } from '../entities/user.entity';
import { TicketsWebhookService } from '../tickets/tickets-webhook.service';
import {
  buildPaginationMeta,
  PaginatedResult,
} from '../common/interfaces/paginated-result.interface';
import { toPaymentListItem, PaymentListItem } from './payment-list.types';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @Inject(forwardRef(() => TicketsWebhookService))
    private readonly ticketsWebhookService: TicketsWebhookService,
  ) {}

  async create(createDto: CreatePaymentDto, createdById?: string): Promise<Payment> {
    this.logger.log(
      `create payment amount=${createDto.amount} method=${createDto.method} ticketId=${(createDto as any).ticketId ?? 'none'}`,
    );
    const payment = this.paymentRepository.create({
      ...createDto,
      status: PaymentStatus.PENDING,
      createdById,
    });

    const savedPayment = await this.paymentRepository.save(payment);
    this.logger.log(`payment created id=${savedPayment.id}`);
    return savedPayment;
  }

  async completePayment(
    paymentId: string,
    transactionId: string | undefined,
    auth: { userId: string; role: UserRole },
  ): Promise<Payment> {
    this.logger.log(`completePayment paymentId=${paymentId} transactionId=${transactionId ?? 'none'}`);
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['ticket'],
    });

    if (!payment) {
      throw new NotFoundException('Paiement introuvable');
    }

    if (auth.role === UserRole.STUDENT) {
      if (payment.createdById !== auth.userId) {
        throw new ForbiddenException('Ce paiement ne correspond pas à votre compte');
      }
      if (payment.method === PaymentMethod.MOBILE_MONEY) {
        if (
          payment.status === PaymentStatus.PENDING ||
          payment.status === PaymentStatus.PROCESSING
        ) {
          throw new BadRequestException(
            'Pour Mobile Money Kelpay, finalisez avec POST /api/payments/:id/kelpay/confirm (le statut doit être « payé » côté Kelpay avant).',
          );
        }
      }
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      return payment;
    }

    const terminalBad = [
      PaymentStatus.FAILED,
      PaymentStatus.EXPIRED,
      PaymentStatus.CANCELLED,
    ];
    if (terminalBad.includes(payment.status)) {
      throw new BadRequestException(`Impossible de compléter un paiement en statut « ${payment.status} »`);
    }

    payment.status = PaymentStatus.COMPLETED;
    if (transactionId) {
      payment.transactionId = transactionId;
    }

    const savedPayment = await this.paymentRepository.save(payment);

    if (savedPayment.ticketId && savedPayment.status === PaymentStatus.COMPLETED) {
      await this.ticketsWebhookService.handlePaymentCompleted(savedPayment.id);
    }

    return savedPayment;
  }

  async findAllPaginated(
    query: ListPaymentsQueryDto,
    auth: { userId?: string; role?: UserRole },
  ): Promise<PaginatedResult<PaymentListItem>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    this.logger.log(
      `findAllPaginated page=${page} limit=${limit} role=${auth.role ?? 'all'} userId=${auth.userId ?? 'all'}`,
    );

    const qb = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.ticket', 'ticket')
      .leftJoinAndSelect('payment.createdBy', 'createdBy')
      .orderBy('payment.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (auth.role === UserRole.STUDENT && auth.userId) {
      qb.andWhere('payment.createdById = :userId', { userId: auth.userId });
    } else if (query.createdById) {
      qb.andWhere('payment.createdById = :createdById', { createdById: query.createdById });
    }

    if (query.status) {
      qb.andWhere('payment.status = :status', { status: query.status });
    }

    if (query.method) {
      qb.andWhere('payment.method = :method', { method: query.method });
    }

    const search = query.search?.trim();
    if (search) {
      qb.andWhere(
        `(payment.transactionId ILIKE :search OR payment.merchantReference ILIKE :search OR payment.phoneNumber ILIKE :search)`,
        { search: `%${search}%` },
      );
    }

    const [payments, total] = await qb.getManyAndCount();

    return {
      data: payments.map(toPaymentListItem),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async findOne(id: string, userId?: string, userRole?: UserRole): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['ticket', 'createdBy'],
    });

    if (!payment) {
      throw new NotFoundException('Paiement introuvable');
    }

    if (userRole === UserRole.STUDENT && userId && payment.createdById !== userId) {
      throw new ForbiddenException('Ce paiement ne correspond pas à votre compte');
    }

    return payment;
  }

  async findByTransactionId(transactionId: string): Promise<Payment> {
    this.logger.log(`findByTransactionId transactionId=${transactionId}`);
    return await this.paymentRepository.findOne({
      where: { transactionId },
      relations: ['ticket', 'createdBy'],
    });
  }

  async updateStatus(id: string, status: PaymentStatus): Promise<Payment> {
    this.logger.log(`updateStatus payment id=${id} status=${status}`);
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['ticket'],
    });

    if (!payment) {
      throw new NotFoundException('Paiement introuvable');
    }

    payment.status = status;
    const savedPayment = await this.paymentRepository.save(payment);

    if (
      (status === PaymentStatus.FAILED ||
        status === PaymentStatus.EXPIRED ||
        status === PaymentStatus.CANCELLED) &&
      savedPayment.ticketId
    ) {
      await this.ticketsWebhookService.handlePaymentFailed(savedPayment.id);
    }
    if (
      (status === PaymentStatus.COMPLETED || status === PaymentStatus.SUCCESS) &&
      savedPayment.ticketId
    ) {
      await this.ticketsWebhookService.handlePaymentCompleted(savedPayment.id);
    }

    return savedPayment;
  }
}
