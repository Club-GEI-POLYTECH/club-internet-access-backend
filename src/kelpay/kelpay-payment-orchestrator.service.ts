import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Payment, PaymentMethod, PaymentStatus } from '../entities/payment.entity';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { TicketType } from '../entities/ticket-type.entity';
import { UserRole } from '../entities/user.entity';
import { KelpayApiClient } from './kelpay-api.client';
import { InitiateKelpayPaymentDto } from './dto/initiate-kelpay-payment.dto';
import {
  KelpayParsedResponse,
  KelpayResponseKind,
  KelpayTransactionState,
} from './kelpay.types';
import { KELPAY_CURRENCY_DEFAULT } from './kelpay.constants';
import { TicketsWebhookService } from '../tickets/tickets-webhook.service';
import { TicketsService } from '../tickets/tickets.service';
import { inferKelpayCheckOutcome, parseKelpayResponse } from './kelpay-response.util';
import { truncateForLog } from './kelpay-logging.util';
import { randomUUID } from 'crypto';

const TERMINAL: PaymentStatus[] = [
  PaymentStatus.SUCCESS,
  PaymentStatus.COMPLETED,
  PaymentStatus.FAILED,
  PaymentStatus.EXPIRED,
  PaymentStatus.CANCELLED,
];

const OPEN: PaymentStatus[] = [PaymentStatus.PENDING, PaymentStatus.PROCESSING];

export type KelpayManualVerifyResponse = {
  paymentId: string;
  paymentStatus: PaymentStatus;
  kelpayTransactionStatus: KelpayTransactionState | null;
  readyToConfirm: boolean;
  message?: string;
  merchantReference?: string;
  transactionId?: string;
};

export type KelpayManualConfirmResponse = {
  paymentId: string;
  status: PaymentStatus;
  alreadyFinalized: boolean;
  ticket?: {
    id: string;
    username: string;
    status: TicketStatus;
    profile?: string;
    timeLimit?: string | null;
    /** Mot de passe Wi‑Fi en clair lorsque le ticket est `sold` (après confirm ou callback). */
    password?: string;
  };
};

/** `POST /payments/:id/kelpay/cancel` — abandon avant `confirm` (statuts `pending` / `processing`). */
export type KelpayManualCancelResponse = {
  paymentId: string;
  status: PaymentStatus;
  /** Déjà `cancelled`, `failed`, etc. : aucune modification. */
  alreadyTerminal: boolean;
};

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
    private readonly ticketsService: TicketsService,
  ) {}

  private normalizePhone(phone: string): string {
    const cleaned = phone.replace(/\s+/g, '');
    let out: string;
    if (cleaned.startsWith('+243')) out = cleaned;
    else if (cleaned.startsWith('243')) out = `+${cleaned}`;
    else if (cleaned.startsWith('0')) out = `+243${cleaned.substring(1)}`;
    else out = `+243${cleaned}`;
    this.logger.debug(`normalizePhone: longueur_entrée=${phone.length} suffixe=${out.slice(-4)}`);
    return out;
  }

  private amountsMatch(a: number, b: number): boolean {
    const ok = Math.abs(Number(a) - Number(b)) < 0.01;
    if (!ok) {
      this.logger.debug(`amountsMatch: refusé a=${a} b=${b}`);
    }
    return ok;
  }

  /**
   * URL absolue du webhook KELPAY (POST vers ce backend). Obligatoire pour l’API payment.asp.
   * Priorité : KELPAY_CALLBACK_URL → PUBLIC_API_URL / API_PUBLIC_URL / KELPAY_CALLBACK_BASE_URL → RAILWAY_PUBLIC_DOMAIN + KELPAY_CALLBACK_PATH.
   * En dev sans base publique : http://127.0.0.1:PORT/api/payments/callback (Kelpay ne pourra pas y joindre sans tunnel type ngrok).
   */
  private resolveKelpayCallbackUrl(): string {
    const explicit = this.config.get<string>('KELPAY_CALLBACK_URL')?.trim();
    if (explicit) {
      this.logger.log(`resolveKelpayCallbackUrl: KELPAY_CALLBACK_URL (len=${explicit.length})`);
      return explicit;
    }

    const path = (this.config.get<string>('KELPAY_CALLBACK_PATH') ?? '/api/payments/callback').trim();
    const normalizePath = path.startsWith('/') ? path : `/${path}`;

    let base =
      this.config.get<string>('PUBLIC_API_URL')?.trim() ||
      this.config.get<string>('API_PUBLIC_URL')?.trim() ||
      this.config.get<string>('KELPAY_CALLBACK_BASE_URL')?.trim() ||
      '';

    if (!base && this.config.get<string>('RAILWAY_PUBLIC_DOMAIN')?.trim()) {
      base = `https://${this.config.get<string>('RAILWAY_PUBLIC_DOMAIN')!.trim()}`;
      this.logger.log('resolveKelpayCallbackUrl: composition via RAILWAY_PUBLIC_DOMAIN');
    } else if (base) {
      this.logger.log('resolveKelpayCallbackUrl: composition via PUBLIC_API_URL / CALLBACK_BASE');
    }

    if (base) {
      const b = base.replace(/\/$/, '');
      const url = `${b}${normalizePath}`;
      this.logger.log(`resolveKelpayCallbackUrl: URL composée len=${url.length}`);
      return url;
    }

    if (this.config.get<string>('NODE_ENV') === 'production') {
      this.logger.error('resolveKelpayCallbackUrl: production sans URL — exception');
      throw new BadRequestException(
        'URL callback KELPAY obligatoire : définissez KELPAY_CALLBACK_URL (recommandé), ou PUBLIC_API_URL / KELPAY_CALLBACK_BASE_URL avec KELPAY_CALLBACK_PATH=/api/payments/callback, ou RAILWAY_PUBLIC_DOMAIN.',
      );
    }

    const port = Number(this.config.get('PORT')) || 4000;
    const devUrl = `http://127.0.0.1:${port}${normalizePath}`;
    this.logger.warn(`resolveKelpayCallbackUrl: fallback dev → ${devUrl}`);
    return devUrl;
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
    const serialized = JSON.stringify(arr);
    this.logger.debug(
      `appendProviderLog: label=${label} events=${arr.length} serialized_len=${serialized.length}`,
    );
    return serialized;
  }

  /**
   * Réserve le ticket, crée le paiement PENDING, appelle KELPAY (push).
   * Aucun `checktransaction` automatique côté serveur : le client enchaîne verify puis confirm (callback Kelpay peut finaliser seul).
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
    this.logger.log(
      `initiate: début ticketId=${dto.ticketId} userId=${dto.userId} role=${auth.role} amount=${dto.amount}`,
    );
    if (auth.role === UserRole.STUDENT && dto.userId !== auth.userId) {
      this.logger.warn(
        `initiate: refus Forbidden — dto.userId=${dto.userId} !== auth.userId=${auth.userId}`,
      );
      throw new ForbiddenException('userId ne correspond pas au compte authentifié');
    }

    const callbackurl = this.resolveKelpayCallbackUrl();

    const merchantReference = `KP-${randomUUID()}`;
    const normalizedPhone = this.normalizePhone(dto.phoneNumber);
    this.logger.log(
      `initiate: merchantReference=${merchantReference} phone_suffixe=${normalizedPhone.slice(-4)}`,
    );

    this.logger.log('initiate: début transaction DB (verrou ticket + création paiement)');
    const { payment } = await this.dataSource.transaction(async (manager) => {
      const ticketRepo = manager.getRepository(Ticket);
      const paymentRepo = manager.getRepository(Payment);
      const ticketTypeRepo = manager.getRepository(TicketType);

      // Ne pas joindre ticketType ici : avec PostgreSQL, FOR UPDATE + LEFT JOIN sur la relation
      // nullable déclenche « FOR UPDATE cannot be applied to the nullable side of an outer join ».
      const ticket = await ticketRepo.findOne({
        where: { id: dto.ticketId },
        lock: { mode: 'pessimistic_write' },
      });
      this.logger.debug(
        `initiate: ticket chargé id=${dto.ticketId} trouvé=${!!ticket} status=${ticket?.status ?? 'n/a'}`,
      );

      if (!ticket) {
        this.logger.warn(`initiate: NotFound ticketId=${dto.ticketId}`);
        throw new NotFoundException('Ticket introuvable');
      }
      if (ticket.status !== TicketStatus.AVAILABLE) {
        this.logger.warn(`initiate: BadRequest ticket non disponible status=${ticket.status}`);
        throw new BadRequestException('Le ticket doit être disponible à l’achat (statut disponible, sans autre paiement Kelpay en cours sur cette ligne).');
      }
      const ticketType = ticket.ticketTypeId
        ? await ticketTypeRepo.findOne({ where: { id: ticket.ticketTypeId } })
        : null;
      this.logger.debug(
        `initiate: ticketType id=${ticket.ticketTypeId ?? 'null'} trouvé=${!!ticketType} prix=${ticketType ? Number(ticketType.price) : 'n/a'}`,
      );
      if (!ticketType) {
        this.logger.warn(`initiate: BadRequest ticket sans type ticketId=${ticket.id}`);
        throw new BadRequestException('Ticket sans type : impossible de valider le montant');
      }
      const salePrice = Number(ticketType.price);
      if (!this.amountsMatch(salePrice, dto.amount)) {
        this.logger.warn(
          `initiate: BadRequest montant dto=${dto.amount} ≠ prix_type=${salePrice}`,
        );
        throw new BadRequestException(
          `Le montant (${dto.amount}) ne correspond pas au prix du type (${salePrice})`,
        );
      }

      const openKelpay = await paymentRepo.findOne({
        where: {
          ticketId: ticket.id,
          method: PaymentMethod.MOBILE_MONEY,
          status: In([PaymentStatus.PENDING, PaymentStatus.PROCESSING]),
        },
      });
      if (openKelpay) {
        this.logger.warn(
          `initiate: BadRequest paiement Kelpay déjà ouvert sur ticketId=${ticket.id} paymentId=${openKelpay.id}`,
        );
        throw new BadRequestException(
          'Un paiement Mobile Money est déjà en cours pour ce ticket. Finalisez-le ou attendez son expiration.',
        );
      }

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
      this.logger.log(`initiate: paiement créé paymentId=${payment.id} status=PENDING (ticket reste AVAILABLE)`);

      return { payment };
    });

    this.logger.log(`initiate: transaction DB commit OK paymentId=${payment.id}`);
    this.logger.log(`KELPAY callbackurl=${callbackurl}`);

    const currency = this.config.get<string>('KELPAY_CURRENCY', KELPAY_CURRENCY_DEFAULT);
    this.logger.log(`initiate: appel kelpayClient.initiatePayment currency=${currency} ref=${merchantReference}`);

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
      this.logger.error(
        `initiate: exception HTTP/API kelpay initiatePayment paymentId=${payment.id} err=${err?.message}`,
        err?.stack,
      );
      await this.rollbackInitiationFailure(payment.id, err?.message ?? String(err));
      throw new BadRequestException(`Échec d’initiation KELPAY: ${err?.message ?? err}`);
    }

    this.logger.log(
      `initiate: réponse kelpay code=${kelpay.code ?? kelpay.fields['code'] ?? 'n/a'} transactionid=${kelpay.transactionid ?? 'n/a'} transactionstatus=${kelpay.transactionstatus ?? 'n/a'}`,
    );

    const acceptCode = (kelpay.code ?? kelpay.fields['code'] ?? '').trim();
    if (acceptCode !== '0') {
      const reason =
        kelpay.message ||
        kelpay.fields['description'] ||
        `Requête KELPAY non acceptée (code=${acceptCode || 'absent'})`;
      this.logger.error(
        `initiate: refus Kelpay acceptCode=${acceptCode || 'vide'} paymentId=${payment.id} reason=${reason}`,
      );
      await this.finalizeFailure(payment.id, reason, kelpay);
      throw new BadRequestException(reason);
    }

    const txId = kelpay.transactionid?.trim();
    this.logger.log(`initiate: acceptCode OK — persistance transactionId=${txId ?? 'vide'}`);
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

    this.logger.log(
      `initiate: succès — paymentId=${payment.id} transactionId=${txId} (pas de polling serveur ; verify + confirm ou callback)`,
    );

    this.logger.log(
      `initiate: retour HTTP au client paymentId=${payment.id} merchantReference=${merchantReference} status=pending`,
    );
    return {
      paymentId: payment.id,
      merchantReference,
      transactionId: txId,
      status: PaymentStatus.PENDING,
      kelpay,
    };
  }

  /**
   * Réponse `parsed` : mêmes noms que le JSON Keccel (`code`, `transactionid`, `transactionstatus`, …).
   * Branches verify : **`parsed.code === '1'`** (échec), **`'0'`** (succès), sinon inférence sur `fields` si `code` absent / autre.
   * Toujours interroger Keccel (pas de retour anticipé sur le seul statut DB). Succès → {@link finalizeSuccess}.
   * Échec → {@link finalizeFailure}. Sinon journal + réponse basée sur `parsed`.
   */
  async verifyKelpayPayment(
    paymentId: string,
    auth: { userId: string; role: UserRole },
  ): Promise<KelpayManualVerifyResponse> {
    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Paiement introuvable');
    }
    this.assertKelpayManualAccess(payment, auth);
    this.assertKelpayPaymentEligible(payment);

    const parsed = await this.runSingleKelpayCheckAndPersist(paymentId, 'manual_verify');

    if (parsed.code === '1') {
      await this.finalizeFailure(paymentId, parsed.message ?? 'Kelpay code=1 (échec)', parsed);
      const after = await this.paymentRepository.findOne({ where: { id: paymentId } });
      return {
        paymentId,
        paymentStatus: after?.status ?? PaymentStatus.FAILED,
        kelpayTransactionStatus: 'failed',
        readyToConfirm: false,
        message: parsed.message,
        merchantReference: parsed.reference ?? payment.merchantReference ?? undefined,
        transactionId: parsed.transactionid ?? payment.transactionId ?? undefined,
      };
    }

    if (parsed.code === '0') {
      await this.finalizeSuccess(paymentId, parsed, 'manual_verify');
      const after = await this.paymentRepository.findOne({ where: { id: paymentId } });
      return {
        paymentId,
        paymentStatus: after?.status ?? PaymentStatus.SUCCESS,
        kelpayTransactionStatus: 'success',
        readyToConfirm: false,
        message:
          'Kelpay : transaction réussie (code 0). Paiement en succès et ticket activé. POST kelpay/confirm reste idempotent si rappelé.',
        merchantReference: parsed.reference ?? payment.merchantReference ?? undefined,
        transactionId: parsed.transactionid ?? after?.transactionId ?? payment.transactionId ?? undefined,
      };
    }

    const inferred = inferKelpayCheckOutcome(parsed.fields);
    if (inferred === 'failed') {
      await this.finalizeFailure(paymentId, parsed.message ?? 'Statut FAILED (KELPAY)', parsed);
      const after = await this.paymentRepository.findOne({ where: { id: paymentId } });
      return {
        paymentId,
        paymentStatus: after?.status ?? PaymentStatus.FAILED,
        kelpayTransactionStatus: 'failed',
        readyToConfirm: false,
        message: parsed.message,
        merchantReference: parsed.reference ?? payment.merchantReference ?? undefined,
        transactionId: parsed.transactionid ?? payment.transactionId ?? undefined,
      };
    }

    if (inferred === 'success') {
      await this.finalizeSuccess(paymentId, parsed, 'manual_verify');
      const after = await this.paymentRepository.findOne({ where: { id: paymentId } });
      return {
        paymentId,
        paymentStatus: after?.status ?? PaymentStatus.SUCCESS,
        kelpayTransactionStatus: 'success',
        readyToConfirm: false,
        message:
          'Kelpay : transaction réussie (inférence statut / champs). Paiement en succès et ticket activé. POST kelpay/confirm reste idempotent si rappelé.',
        merchantReference: parsed.reference ?? payment.merchantReference ?? undefined,
        transactionId: parsed.transactionid ?? after?.transactionId ?? payment.transactionId ?? undefined,
      };
    }

    const refreshed = await this.paymentRepository.findOne({ where: { id: paymentId } });
    return {
      paymentId,
      paymentStatus: refreshed?.status ?? payment.status,
      kelpayTransactionStatus: inferred,
      readyToConfirm: false,
      message: parsed.message,
      merchantReference: parsed.reference ?? payment.merchantReference ?? undefined,
      transactionId: parsed.transactionid ?? refreshed?.transactionId ?? payment.transactionId ?? undefined,
    };
  }

  /**
   * Re-vérifie Kelpay puis applique succès/échec (finalize). Idempotent si déjà SUCCESS/COMPLETED.
   */
  async confirmKelpayPayment(
    paymentId: string,
    auth: { userId: string; role: UserRole },
  ): Promise<KelpayManualConfirmResponse> {
    let payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['ticket'],
    });
    if (!payment) {
      throw new NotFoundException('Paiement introuvable');
    }
    this.assertKelpayManualAccess(payment, auth);
    this.assertKelpayPaymentEligible(payment);

    if (payment.status === PaymentStatus.SUCCESS || payment.status === PaymentStatus.COMPLETED) {
      return await this.buildManualConfirmResponse(payment, true);
    }

    if (TERMINAL.includes(payment.status)) {
      throw new BadRequestException(
        'Ce paiement ne peut pas être confirmé (statut terminal autre que succès).',
      );
    }

    const parsed = await this.runSingleKelpayCheckAndPersist(paymentId, 'manual_confirm');
    await this.applyParsedOutcome(paymentId, parsed, 'manual_confirm');

    payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['ticket'],
    });
    if (!payment) {
      throw new NotFoundException('Paiement introuvable');
    }

    if (payment.status === PaymentStatus.SUCCESS || payment.status === PaymentStatus.COMPLETED) {
      return await this.buildManualConfirmResponse(payment, false);
    }

    if (payment.status === PaymentStatus.FAILED) {
      throw new BadRequestException(
        parsed.message ?? 'Le paiement a été refusé ou annulé côté Kelpay.',
      );
    }

    throw new ConflictException(
      'Paiement pas encore confirmé par Kelpay. Validez la demande sur le téléphone puis réessayez verify/confirm.',
    );
  }

  /**
   * Annulation côté application : tant que le paiement n’est pas finalisé (`pending` / `processing`),
   * libère la ligne pour un nouvel achat (statut `cancelled`). Ne contacte pas Kelpay.
   * Si le paiement est déjà en succès (callback ou confirm), renvoie une erreur.
   */
  async cancelKelpayPayment(
    paymentId: string,
    auth: { userId: string; role: UserRole },
  ): Promise<KelpayManualCancelResponse> {
    let payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Paiement introuvable');
    }
    this.assertKelpayManualAccess(payment, auth);
    this.assertKelpayPaymentEligible(payment);

    if (payment.status === PaymentStatus.SUCCESS || payment.status === PaymentStatus.COMPLETED) {
      throw new BadRequestException(
        'Impossible d’annuler : le paiement est déjà réussi et le ticket est attribué.',
      );
    }

    if (!OPEN.includes(payment.status)) {
      return {
        paymentId: payment.id,
        status: payment.status,
        alreadyTerminal: true,
      };
    }

    const cancelLog: KelpayParsedResponse = {
      raw: 'client_cancel',
      fields: {},
      transactionstatus: 'Cancelled',
      message: 'Annulation demandée par l’utilisateur avant finalisation.',
    };

    let transitioned = false;
    await this.dataSource.transaction(async (mgr) => {
      const repo = mgr.getRepository(Payment);
      const p = await repo.findOne({
        where: { id: paymentId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!p) {
        return;
      }
      if (p.status === PaymentStatus.SUCCESS || p.status === PaymentStatus.COMPLETED) {
        throw new ConflictException(
          'Le paiement a été finalisé entre-temps (succès). Impossible d’annuler.',
        );
      }
      if (!OPEN.includes(p.status)) {
        return;
      }
      p.status = PaymentStatus.CANCELLED;
      p.providerResponse = this.appendProviderLog(p.providerResponse, 'client_cancel', cancelLog);
      await repo.save(p);
      transitioned = true;
    });

    if (!transitioned) {
      const refreshed = await this.paymentRepository.findOne({ where: { id: paymentId } });
      if (!refreshed) {
        throw new NotFoundException('Paiement introuvable');
      }
      return {
        paymentId: refreshed.id,
        status: refreshed.status,
        alreadyTerminal: true,
      };
    }

    this.logger.log(`cancelKelpayPayment: paymentId=${paymentId} → CANCELLED (libération ticket si besoin)`);
    await this.ticketsWebhookService.handlePaymentFailed(paymentId);
    return {
      paymentId,
      status: PaymentStatus.CANCELLED,
      alreadyTerminal: false,
    };
  }

  /**
   * Webhook KELPAY : POST public (JSON ou x-www-form-urlencoded).
   * Corrélation par `reference` (= merchantReference KP-…) ou `transactionid`.
   * Réponse HTTP : le contrôleur renvoie le texte brut `OK` (exigence doc).
   */
  async handleKelpayCallback(body: unknown): Promise<void> {
    const bodyType =
      body === null ? 'null' : body === undefined ? 'undefined' : typeof body === 'object' ? 'object' : typeof body;
    const raw =
      typeof body === 'string'
        ? body
        : body !== null && body !== undefined && typeof body === 'object'
          ? JSON.stringify(body)
          : '';
    this.logger.log(
      `[KELPAY → backend] POST /api/payments/callback corps_type=${bodyType} brut_len=${raw.length} brut_preview=${truncateForLog(raw)}`,
    );
    const parsed = parseKelpayResponse(raw, KelpayResponseKind.CHECK_TRANSACTION);
    this.logger.log(
      `[KELPAY → backend] callback interprété code=${parsed.code ?? 'n/a'} transactionstatus=${parsed.transactionstatus ?? 'n/a'} ref=${parsed.reference ?? '-'} transactionid=${parsed.transactionid ?? '-'} msg=${parsed.message ?? '-'}`,
    );

    const ref = parsed.reference?.trim();
    const tx = parsed.transactionid?.trim();

    let payment: Payment | null = null;
    if (ref !== undefined && ref !== '') {
      this.logger.log(`handleKelpayCallback: recherche par merchantReference=${ref}`);
      payment = await this.paymentRepository.findOne({ where: { merchantReference: ref } });
    }
    if (!payment && tx) {
      this.logger.log(`handleKelpayCallback: recherche par transactionId=${tx}`);
      payment = await this.paymentRepository.findOne({ where: { transactionId: tx } });
    }
    if (!payment) {
      this.logger.warn(`KELPAY callback: paiement introuvable (ref=${ref ?? 'n/a'}, tx=${tx ?? 'n/a'})`);
      return;
    }

    this.logger.log(
      `handleKelpayCallback: paiement trouvé paymentId=${payment.id} status_actuel=${payment.status}`,
    );
    const patch: Partial<Payment> = {
      providerResponse: this.appendProviderLog(payment.providerResponse, 'callback', parsed),
    };
    if (tx && !payment.transactionId) {
      patch.transactionId = tx;
      this.logger.log(`handleKelpayCallback: complétion transactionId depuis callback`);
    }
    await this.paymentRepository.update({ id: payment.id }, patch);
    this.logger.log(`handleKelpayCallback: providerResponse mis à jour paymentId=${payment.id}`);

    const outcome = this.resolveKelpayCheckTerminal(parsed);
    if (outcome === 'success') {
      this.logger.log(`handleKelpayCallback: branche SUCCESS → finalizeSuccess`);
      await this.finalizeSuccess(payment.id, parsed, 'callback');
    } else if (outcome === 'failed') {
      this.logger.warn(`handleKelpayCallback: branche FAILED → finalizeFailure`);
      await this.finalizeFailure(
        payment.id,
        parsed.message ?? 'Échec (notification KELPAY)',
        parsed,
      );
    } else {
      this.logger.log(
        `KELPAY callback: statut non terminal (code=${parsed.code ?? 'n/a'} transactionstatus=${parsed.transactionstatus ?? 'n/a'}), journal uniquement paymentId=${payment.id}`,
      );
    }
  }

  private async rollbackInitiationFailure(paymentId: string, message: string): Promise<void> {
    this.logger.warn(`rollbackInitiationFailure: paymentId=${paymentId} message=${message.slice(0, 200)}`);
    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (!payment) {
      this.logger.warn(`rollbackInitiationFailure: paiement introuvable id=${paymentId}`);
      return;
    }
    payment.status = PaymentStatus.FAILED;
    payment.providerResponse = this.appendProviderLog(
      payment.providerResponse,
      'initiate_http_error',
      parseKelpayResponse(message, KelpayResponseKind.CHECK_TRANSACTION),
    );
    await this.paymentRepository.save(payment);
    this.logger.log(
      `rollbackInitiationFailure: payment sauvé status=FAILED paymentId=${paymentId} ticketId=${payment.ticketId ?? 'none'}`,
    );
    if (payment.ticketId) {
      this.logger.warn(
        `KELPAY paiement en échec (erreur avant confirmation) paymentId=${paymentId} raison=${message}`,
      );
      await this.ticketsWebhookService.handlePaymentFailed(paymentId);
    } else {
      this.logger.warn(
        `rollbackInitiationFailure: pas de ticketId — handlePaymentFailed non appelé paymentId=${paymentId}`,
      );
    }
  }

  private assertKelpayManualAccess(payment: Payment, auth: { userId: string; role: UserRole }): void {
    if (auth.role === UserRole.STUDENT && payment.createdById !== auth.userId) {
      throw new ForbiddenException('userId ne correspond pas au compte authentifié');
    }
  }

  private assertKelpayPaymentEligible(payment: Payment): void {
    if (payment.method !== PaymentMethod.MOBILE_MONEY) {
      throw new BadRequestException('Ce paiement n’est pas un paiement Mobile Money KELPAY');
    }
  }

  /**
   * Pour **checktransaction** / callback : d’abord `parsed.code` (`"0"` / `"1"`), sinon inférence sur `fields`.
   * Ne pas utiliser pour interpréter l’init `payment.asp` (autre sémantique du `code`).
   */
  private resolveKelpayCheckTerminal(parsed: KelpayParsedResponse): KelpayTransactionState {
    const c = parsed.code?.trim();
    if (c === '0') return 'success';
    if (c === '1') return 'failed';
    return inferKelpayCheckOutcome(parsed.fields);
  }

  private async buildManualConfirmResponse(
    payment: Payment,
    alreadyFinalized: boolean,
  ): Promise<KelpayManualConfirmResponse> {
    const t = payment.ticket;
    let password: string | undefined;
    if (t?.status === TicketStatus.SOLD) {
      password = await this.ticketsService.getPlainPasswordForSoldTicket(t);
    }
    return {
      paymentId: payment.id,
      status: payment.status,
      alreadyFinalized,
      ticket: t
        ? {
            id: t.id,
            username: t.username,
            status: t.status,
            profile: t.profile,
            timeLimit: t.timeLimit,
            ...(password ? { password } : {}),
          }
        : undefined,
    };
  }

  /**
   * Un appel `checktransaction` + persistance du journal (`providerResponse`).
   */
  private async runSingleKelpayCheckAndPersist(
    paymentId: string,
    logLabel: string,
  ): Promise<KelpayParsedResponse> {
    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    const tx = payment?.transactionId?.trim();
    if (!payment || !tx) {
      throw new BadRequestException('transactionId Kelpay manquant pour ce paiement');
    }
    let parsed: KelpayParsedResponse;
    try {
      parsed = await this.kelpayClient.checkTransaction(tx);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`runSingleKelpayCheckAndPersist: erreur Kelpay paymentId=${paymentId} ${msg}`);
      throw new BadRequestException(`Échec checktransaction KELPAY: ${msg}`);
    }
    const fresh = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (fresh) {
      fresh.providerResponse = this.appendProviderLog(fresh.providerResponse, logLabel, parsed);
      await this.paymentRepository.save(fresh);
    }
    return parsed;
  }

  private async applyParsedOutcome(
    paymentId: string,
    parsed: KelpayParsedResponse,
    source: string,
  ): Promise<void> {
    const outcome = this.resolveKelpayCheckTerminal(parsed);
    this.logger.log(
      `applyParsedOutcome: paymentId=${paymentId} source=${source} outcome=${outcome} code=${parsed.code ?? 'n/a'} transactionstatus=${parsed.transactionstatus ?? 'n/a'}`,
    );
    if (outcome === 'success') {
      this.logger.log(`applyParsedOutcome: → finalizeSuccess`);
      await this.finalizeSuccess(paymentId, parsed, source);
    } else if (outcome === 'failed') {
      this.logger.warn(`applyParsedOutcome: → finalizeFailure (échec Kelpay)`);
      await this.finalizeFailure(paymentId, parsed.message ?? 'Statut FAILED (KELPAY)', parsed);
    } else {
      this.logger.log(
        `applyParsedOutcome: statut non terminal (${outcome}) — aucune transition success/failure paymentId=${paymentId}`,
      );
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
    const tx = parsed.transactionid?.trim();
    let transitioned = false;

    this.logger.log(
      `finalizeSuccess: entrée paymentId=${paymentId} source=${source} tx=${tx ?? 'n/a'}`,
    );

    await this.dataSource.transaction(async (mgr) => {
      const repo = mgr.getRepository(Payment);
      const p = await repo.findOne({
        where: { id: paymentId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!p) {
        this.logger.warn(`finalizeSuccess: paiement introuvable en transaction id=${paymentId}`);
        return;
      }
      if (TERMINAL.includes(p.status)) {
        this.logger.log(
          `finalizeSuccess: idempotent — déjà terminal status=${p.status} paymentId=${paymentId}`,
        );
        p.providerResponse = this.appendProviderLog(p.providerResponse, `${source}_idempotent`, parsed);
        await repo.save(p);
        return;
      }
      if (!OPEN.includes(p.status)) {
        this.logger.warn(
          `finalizeSuccess: skip — statut non ouvert (${p.status}) paymentId=${paymentId}`,
        );
        return;
      }

      p.status = PaymentStatus.SUCCESS;
      if (tx) p.transactionId = tx;
      p.providerResponse = this.appendProviderLog(p.providerResponse, `${source}_success`, parsed);
      await repo.save(p);
      transitioned = true;
      this.logger.log(`finalizeSuccess: SUCCESS enregistré paymentId=${paymentId} source=${source}`);

      if (p.ticketId) {
        await this.ticketsService.claimTicketForSuccessfulKelpayPayment(
          mgr,
          p.ticketId,
          p.id,
          p.phoneNumber ?? '',
        );
      }
    });

    if (transitioned) {
      this.logger.log(`finalizeSuccess: appel handlePaymentCompleted paymentId=${paymentId}`);
      await this.ticketsWebhookService.handlePaymentCompleted(paymentId);
      this.logger.log(`finalizeSuccess: handlePaymentCompleted terminé paymentId=${paymentId}`);
    } else {
      this.logger.log(`finalizeSuccess: pas de transition (déjà traité ou skip) paymentId=${paymentId}`);
    }
  }

  private async finalizeFailure(
    paymentId: string,
    reason: string,
    parsed?: KelpayParsedResponse,
  ): Promise<void> {
    this.logger.log(
      `finalizeFailure: entrée paymentId=${paymentId} raison=${reason.slice(0, 300)} parsed=${parsed ? 'oui' : 'non'}`,
    );
    let transitioned = false;
    await this.dataSource.transaction(async (mgr) => {
      const repo = mgr.getRepository(Payment);
      const p = await repo.findOne({
        where: { id: paymentId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!p) {
        this.logger.warn(`finalizeFailure: paiement introuvable id=${paymentId}`);
        return;
      }
      if (TERMINAL.includes(p.status)) {
        this.logger.log(
          `finalizeFailure: skip — déjà terminal status=${p.status} paymentId=${paymentId}`,
        );
        return;
      }
      if (!OPEN.includes(p.status)) {
        this.logger.warn(
          `finalizeFailure: skip — statut non ouvert (${p.status}) paymentId=${paymentId}`,
        );
        return;
      }
      p.status = PaymentStatus.FAILED;
      p.providerResponse = parsed
        ? this.appendProviderLog(p.providerResponse, 'failure', parsed)
        : this.appendProviderLog(p.providerResponse, 'failure', {
            raw: reason,
            fields: {},
            code: '1',
            transactionstatus: 'Failed',
          });
      await repo.save(p);
      transitioned = true;
      this.logger.log(`finalizeFailure: FAILED enregistré paymentId=${paymentId}`);
    });
    if (transitioned) {
      this.logger.warn(
        `KELPAY paiement en échec paymentId=${paymentId} raison=${reason}`,
      );
      this.logger.log(`finalizeFailure: appel handlePaymentFailed paymentId=${paymentId}`);
      await this.ticketsWebhookService.handlePaymentFailed(paymentId);
      this.logger.log(`finalizeFailure: handlePaymentFailed terminé paymentId=${paymentId}`);
    } else {
      this.logger.log(
        `finalizeFailure: aucune écriture FAILED (déjà terminal ou statut inattendu) paymentId=${paymentId}`,
      );
    }
  }
}
