import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Payment, PaymentMethod, PaymentStatus } from '../entities/payment.entity';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { UserRole } from '../entities/user.entity';
import { KelpayApiClient } from './kelpay-api.client';
import { InitiateKelpayPaymentDto } from './dto/initiate-kelpay-payment.dto';
import { KelpayParsedResponse, KelpayResponseKind } from './kelpay.types';
import {
  KELPAY_CURRENCY_DEFAULT,
  KELPAY_POLL_INITIAL_DELAY_MS_DEFAULT,
  KELPAY_POLL_INTERVAL_MS_DEFAULT,
  KELPAY_POLL_MAX_ATTEMPTS_DEFAULT,
  KELPAY_POLL_MAX_DURATION_MS_DEFAULT,
} from './kelpay.constants';
import { TicketsWebhookService } from '../tickets/tickets-webhook.service';
import { parseKelpayResponse } from './kelpay-response.util';
import { randomUUID } from 'crypto';

const TERMINAL: PaymentStatus[] = [
  PaymentStatus.SUCCESS,
  PaymentStatus.COMPLETED,
  PaymentStatus.FAILED,
  PaymentStatus.EXPIRED,
  PaymentStatus.CANCELLED,
];

const OPEN: PaymentStatus[] = [PaymentStatus.PENDING, PaymentStatus.PROCESSING];

@Injectable()
export class KelpayPaymentOrchestratorService {
  private readonly logger = new Logger(KelpayPaymentOrchestratorService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly kelpayClient: KelpayApiClient,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly ticketsWebhookService: TicketsWebhookService,
  ) {}

  private normalizePhone(phone: string): string {
    const cleaned = phone.replace(/\s+/g, '');
    if (cleaned.startsWith('+243')) return cleaned;
    if (cleaned.startsWith('243')) return `+${cleaned}`;
    if (cleaned.startsWith('0')) return `+243${cleaned.substring(1)}`;
    return `+243${cleaned}`;
  }

  private amountsMatch(a: number, b: number): boolean {
    return Math.abs(Number(a) - Number(b)) < 0.01;
  }

  private appendProviderLog(
    existing: string | null | undefined,
    label: string,
    parsed: KelpayParsedResponse,
  ): string {
    let arr: unknown[] = [];
    if (existing) {
      try {
        const p = JSON.parse(existing);
        arr = Array.isArray(p) ? p : [{ legacy: existing }];
      } catch {
        arr = [{ legacy: existing }];
      }
    }
    arr.push({
      t: label,
      at: new Date().toISOString(),
      raw: parsed.raw,
      fields: parsed.fields,
    });
    return JSON.stringify(arr);
  }

  /**
   * Réserve le ticket, crée le paiement PENDING, appelle KELPAY puis lance le polling actif.
   */
  async initiate(
    dto: InitiateKelpayPaymentDto,
    auth: { userId: string; role: UserRole },
  ): Promise<{
    paymentId: string;
    merchantReference: string;
    transactionId?: string;
    status: PaymentStatus;
    kelpay: KelpayParsedResponse;
  }> {
    if (auth.role === UserRole.STUDENT && dto.userId !== auth.userId) {
      throw new ForbiddenException('userId ne correspond pas au compte authentifié');
    }

    const merchantReference = `KP-${randomUUID()}`;
    const normalizedPhone = this.normalizePhone(dto.phoneNumber);

    const { payment } = await this.dataSource.transaction(async (manager) => {
      const ticketRepo = manager.getRepository(Ticket);
      const paymentRepo = manager.getRepository(Payment);

      const ticket = await ticketRepo.findOne({
        where: { id: dto.ticketId },
        relations: ['ticketType'],
        lock: { mode: 'pessimistic_write' },
      });

      if (!ticket) {
        throw new NotFoundException('Ticket introuvable');
      }
      if (ticket.status !== TicketStatus.AVAILABLE) {
        throw new BadRequestException('Le ticket doit être disponible (non réservé)');
      }
      if (!ticket.ticketType) {
        throw new BadRequestException('Ticket sans type : impossible de valider le montant');
      }
      const salePrice = Number(ticket.ticketType.price);
      if (!this.amountsMatch(salePrice, dto.amount)) {
        throw new BadRequestException(
          `Le montant (${dto.amount}) ne correspond pas au prix du type (${salePrice})`,
        );
      }

      ticket.status = TicketStatus.RESERVED;
      await ticketRepo.save(ticket);

      const payment = paymentRepo.create({
        amount: dto.amount,
        method: PaymentMethod.MOBILE_MONEY,
        status: PaymentStatus.PENDING,
        phoneNumber: normalizedPhone,
        ticketId: ticket.id,
        createdById: dto.userId,
        merchantReference,
        notes: `KELPAY ticket ${ticket.username}`,
      });
      await paymentRepo.save(payment);

      ticket.paymentId = payment.id;
      await ticketRepo.save(ticket);

      return { payment };
    });

    // Kelpay ne notifie pas ce projet par HTTP : confirmation uniquement via checktransaction (polling serveur).
    // Si la passerelle exige quand même le champ, on peut le remplir via KELPAY_CALLBACK_URL (sinon chaîne vide).
    const explicitCallback = this.config.get<string>('KELPAY_CALLBACK_URL')?.trim();
    const callbackBase =
      this.config.get<string>('KELPAY_CALLBACK_BASE_URL')?.trim() ||
      this.config.get<string>('RAILWAY_PUBLIC_DOMAIN')?.trim();
    const callbackPath = this.config.get<string>('KELPAY_CALLBACK_PATH', '/api/payments/callback').trim();
    let callbackurl = '';
    if (explicitCallback) {
      callbackurl = explicitCallback;
    } else if (callbackBase) {
      const base = callbackBase.startsWith('http') ? callbackBase : `https://${callbackBase}`;
      callbackurl = `${base.replace(/\/$/, '')}${callbackPath.startsWith('/') ? callbackPath : `/${callbackPath}`}`;
    }
    if (!callbackurl) {
      this.logger.log(
        'KELPAY: pas d’URL callback — flux sans webhook ; finalisation via polling checktransaction uniquement.',
      );
    }

    const currency = this.config.get<string>('KELPAY_CURRENCY', KELPAY_CURRENCY_DEFAULT);

    let kelpay: KelpayParsedResponse;
    try {
      kelpay = await this.kelpayClient.initiatePayment({
        mobilenumber: normalizedPhone.replace('+', ''),
        reference: merchantReference,
        amount: dto.amount,
        currency,
        description: `Ticket Wi‑Fi ${dto.ticketId}`,
        callbackurl,
      });
    } catch (err: any) {
      this.logger.error(`KELPAY initiate erreur: ${err?.message}`);
      await this.rollbackInitiationFailure(payment.id, err?.message ?? String(err));
      throw new BadRequestException(`Échec d’initiation KELPAY: ${err?.message ?? err}`);
    }

    const acceptCode = (kelpay.kelpayCode ?? kelpay.fields['code'] ?? '').trim();
    if (acceptCode !== '0') {
      const reason =
        kelpay.message ||
        kelpay.fields['description'] ||
        `Requête KELPAY non acceptée (code=${acceptCode || 'absent'})`;
      this.logger.error(`KELPAY initiate refusée: ${reason}`);
      await this.finalizeFailure(payment.id, reason, kelpay);
      throw new BadRequestException(reason);
    }

    const txId = kelpay.transactionId?.trim();
    await this.paymentRepository.update(
      { id: payment.id },
      {
        transactionId: txId || payment.transactionId,
        providerResponse: this.appendProviderLog(null, 'initiate', kelpay),
      },
    );

    if (!txId) {
      this.logger.error('KELPAY: pas de transactionId dans la réponse — annulation');
      await this.finalizeFailure(payment.id, 'Réponse KELPAY sans transactionId', kelpay);
      throw new BadRequestException('Réponse KELPAY invalide (transactionId manquant)');
    }

    setImmediate(() => {
      void this.runActivePolling(payment.id);
    });

    return {
      paymentId: payment.id,
      merchantReference,
      transactionId: txId,
      status: PaymentStatus.PENDING,
      kelpay,
    };
  }

  private async rollbackInitiationFailure(paymentId: string, message: string): Promise<void> {
    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (!payment) return;
    payment.status = PaymentStatus.FAILED;
    payment.providerResponse = this.appendProviderLog(
      payment.providerResponse,
      'initiate_http_error',
      parseKelpayResponse(message, KelpayResponseKind.CHECK_TRANSACTION),
    );
    await this.paymentRepository.save(payment);
    if (payment.ticketId) {
      await this.ticketsWebhookService.handlePaymentFailed(paymentId);
    }
  }

  /** Polling : intervalle configurable, arrêt au 1er état terminal ou après N tentatives / délai max. */
  async runActivePolling(paymentId: string): Promise<void> {
    const intervalMs = parseInt(
      this.config.get<string>('KELPAY_POLL_INTERVAL_MS', String(KELPAY_POLL_INTERVAL_MS_DEFAULT)),
      10,
    );
    const maxDurationMs = parseInt(
      this.config.get<string>('KELPAY_POLL_MAX_DURATION_MS', String(KELPAY_POLL_MAX_DURATION_MS_DEFAULT)),
      10,
    );
    const maxAttempts = parseInt(
      this.config.get<string>('KELPAY_POLL_MAX_ATTEMPTS', String(KELPAY_POLL_MAX_ATTEMPTS_DEFAULT)),
      10,
    );
    const initialDelayMs = parseInt(
      this.config.get<string>(
        'KELPAY_POLL_INITIAL_DELAY_MS',
        String(KELPAY_POLL_INITIAL_DELAY_MS_DEFAULT),
      ),
      10,
    );

    const started = Date.now();
    this.logger.log(
      `Polling KELPAY démarré paymentId=${paymentId} initialDelay=${initialDelayMs}ms interval=${intervalMs}ms maxAttempts=${maxAttempts} maxDuration=${maxDurationMs}ms`,
    );

    if (initialDelayMs > 0) {
      await this.sleep(initialDelayMs);
    }

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (Date.now() - started > maxDurationMs) {
        await this.tryExpire(paymentId, 'Timeout polling (durée max)');
        return;
      }

      if (attempt > 0) {
        await this.sleep(intervalMs);
      }

      const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
      if (!payment || TERMINAL.includes(payment.status)) {
        return;
      }

      if (payment.status === PaymentStatus.PENDING) {
        await this.paymentRepository.update(
          { id: paymentId, status: PaymentStatus.PENDING },
          { status: PaymentStatus.PROCESSING },
        );
      }

      if (!payment.transactionId) {
        this.logger.warn(`Polling stoppé: pas de transactionId paymentId=${paymentId}`);
        await this.finalizeFailure(paymentId, 'transactionId manquant en base', {
          raw: '',
          fields: {},
          transactionStatus: 'unknown',
        });
        return;
      }

      let parsed: KelpayParsedResponse;
      try {
        parsed = await this.kelpayClient.checkTransaction(payment.transactionId);
      } catch (e: any) {
        this.logger.warn(`checkTransaction erreur: ${e?.message}`);
        continue;
      }

      const fresh = await this.paymentRepository.findOne({ where: { id: paymentId } });
      if (fresh) {
        fresh.providerResponse = this.appendProviderLog(fresh.providerResponse, `poll_${attempt + 1}`, parsed);
        await this.paymentRepository.save(fresh);
      }

      await this.applyParsedOutcome(paymentId, parsed, 'poll');
    }

    const latest = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (latest && !TERMINAL.includes(latest.status)) {
      await this.tryExpire(paymentId, 'Nombre max de vérifications atteint sans succès définitif');
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  private async tryExpire(paymentId: string, reason: string): Promise<void> {
    let transitioned = false;
    await this.dataSource.transaction(async (mgr) => {
      const repo = mgr.getRepository(Payment);
      const p = await repo.findOne({
        where: { id: paymentId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!p || TERMINAL.includes(p.status)) return;
      if (!OPEN.includes(p.status)) return;
      p.status = PaymentStatus.EXPIRED;
      p.providerResponse = this.appendProviderLog(p.providerResponse, 'expired', {
        raw: reason,
        fields: {},
        transactionStatus: 'unknown',
      });
      await repo.save(p);
      transitioned = true;
    });
    if (transitioned) {
      await this.ticketsWebhookService.handlePaymentFailed(paymentId);
    }
  }

  private async applyParsedOutcome(
    paymentId: string,
    parsed: KelpayParsedResponse,
    source: string,
  ): Promise<void> {
    const st = parsed.transactionStatus;
    if (st === 'success') {
      await this.finalizeSuccess(paymentId, parsed, source);
    } else if (st === 'failed') {
      await this.finalizeFailure(paymentId, parsed.message ?? 'Statut FAILED (KELPAY)', parsed);
    }
  }

  /**
   * Verrou pessimiste + transition atomique pour éviter double attribution de ticket.
   */
  private async finalizeSuccess(
    paymentId: string,
    parsed: KelpayParsedResponse,
    source: string,
  ): Promise<void> {
    const tx = parsed.transactionId?.trim();
    let transitioned = false;

    await this.dataSource.transaction(async (mgr) => {
      const repo = mgr.getRepository(Payment);
      const p = await repo.findOne({
        where: { id: paymentId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!p) return;
      if (TERMINAL.includes(p.status)) {
        p.providerResponse = this.appendProviderLog(p.providerResponse, `${source}_idempotent`, parsed);
        await repo.save(p);
        return;
      }
      if (!OPEN.includes(p.status)) return;

      p.status = PaymentStatus.SUCCESS;
      if (tx) p.transactionId = tx;
      p.providerResponse = this.appendProviderLog(p.providerResponse, `${source}_success`, parsed);
      await repo.save(p);
      transitioned = true;
    });

    if (transitioned) {
      await this.ticketsWebhookService.handlePaymentCompleted(paymentId);
    }
  }

  private async finalizeFailure(
    paymentId: string,
    reason: string,
    parsed?: KelpayParsedResponse,
  ): Promise<void> {
    let transitioned = false;
    await this.dataSource.transaction(async (mgr) => {
      const repo = mgr.getRepository(Payment);
      const p = await repo.findOne({
        where: { id: paymentId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!p || TERMINAL.includes(p.status)) return;
      if (!OPEN.includes(p.status)) return;
      p.status = PaymentStatus.FAILED;
      p.providerResponse = parsed
        ? this.appendProviderLog(p.providerResponse, 'failure', parsed)
        : this.appendProviderLog(p.providerResponse, 'failure', {
            raw: reason,
            fields: {},
            transactionStatus: 'failed',
          });
      await repo.save(p);
      transitioned = true;
    });
    if (transitioned) {
      await this.ticketsWebhookService.handlePaymentFailed(paymentId);
    }
  }
}
