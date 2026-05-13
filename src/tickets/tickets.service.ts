import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { andCatalogAvailableForTicket } from './catalog-available.query';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { TicketType } from '../entities/ticket-type.entity';
import { Payment, PaymentStatus, PaymentMethod } from '../entities/payment.entity';
import { PaymentService } from '../payment/payment.service';
import type { ImportTicketsDto } from './dto/import-tickets.dto';
import * as crypto from 'crypto';
// csv-parse sera installé via npm install csv-parse
// Pour l'instant, on utilise une implémentation simple de parsing CSV

export interface CsvTypeRecommendation {
  typeKey: '24h' | '7j' | '30j';
  typeLabel: string;
  count: number;
  sampleTimeLimit: string | null;
  recommendedPrice: number;
  action: 'use_existing' | 'create_new';
  matchedTicketType: {
    id: string;
    name: string;
    profile: string;
    price: number;
    timeLimit?: string;
    dataLimit?: string;
    isActive: boolean;
  } | null;
}

export interface CsvImportTypeRecommendationsResult {
  summary: {
    totalRows: number;
    uniqueTypes: number;
  };
  recommendations: CsvTypeRecommendation[];
}

@Injectable()
export class TicketsService implements OnModuleInit {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    @InjectRepository(TicketType)
    private ticketTypesRepository: Repository<TicketType>,
    @Inject(forwardRef(() => PaymentService))
    private paymentService: PaymentService,
  ) {}

  async onModuleInit() {
    this.logger.log('✅ TicketsService initialized');
  }

  /**
   * Prix catalogue (CDF) selon la durée (colonne « Time Limit » du CSV Mikhmon).
   * Variables : TICKET_PRICE_24H, TICKET_PRICE_7D, TICKET_PRICE_30D
   */
  priceFromTimeLimit(timeLimitRaw: string): number {
    const p24 = Number(process.env.TICKET_PRICE_24H ?? 1000);
    const p7 = Number(process.env.TICKET_PRICE_7D ?? 3500);
    const p30 = Number(process.env.TICKET_PRICE_30D ?? 9000);
    const bucket = this.classifyTimeLimitDuration(timeLimitRaw);
    if (bucket === '30j') return p30;
    if (bucket === '7j') return p7;
    return p24;
  }

  async findAll(status?: TicketStatus): Promise<Ticket[]> {
    this.logger.log(`findAll tickets${status ? ` status=${status}` : ''}`);
    const where: any = {};
    if (status) {
      where.status = status;
    }

    return await this.ticketsRepository.find({
      where,
      relations: ['ticketType', 'payment'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAvailable(): Promise<Ticket[]> {
    const qb = this.ticketsRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.ticketType', 'ticketType')
      .leftJoinAndSelect('ticket.payment', 'payment');
    andCatalogAvailableForTicket(qb);
    return qb.orderBy('ticket.createdAt', 'DESC').getMany();
  }

  async findAvailableByType(typeId: string): Promise<Ticket[]> {
    const qb = this.ticketsRepository
      .createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.ticketType', 'ticketType')
      .leftJoinAndSelect('ticket.payment', 'payment')
      .where('ticket.ticketTypeId = :typeId', { typeId });
    andCatalogAvailableForTicket(qb);
    return qb.orderBy('ticket.createdAt', 'DESC').getMany();
  }

  /** Nombre de tickets réellement achetables (exclut ceux avec un paiement Kelpay PENDING/PROCESSING). */
  async countCatalogAvailableTickets(): Promise<number> {
    const qb = this.ticketsRepository.createQueryBuilder('ticket');
    andCatalogAvailableForTicket(qb);
    return qb.getCount();
  }

  async findOne(id: string): Promise<Ticket> {
    this.logger.log(`findOne ticket id=${id}`);
    const ticket = await this.ticketsRepository.findOne({
      where: { id },
      relations: ['ticketType', 'payment'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async findOneByUsername(username: string): Promise<Ticket | null> {
    return await this.ticketsRepository.findOne({
      where: { username },
      relations: ['ticketType', 'payment'],
    });
  }

  async purchase(
    ticketId: string,
    phoneNumber: string,
    method: PaymentMethod,
    userId?: string,
  ): Promise<{ ticket: Ticket; payment: Payment; credentials: any }> {
    this.logger.log(
      `purchase ticketId=${ticketId} phone=${phoneNumber} method=${method} userId=${userId ?? 'anonymous'}`,
    );
    const ticket = await this.findOne(ticketId);

    if (ticket.status !== TicketStatus.AVAILABLE) {
      throw new BadRequestException('Ticket is not available for purchase');
    }

    // Normaliser le numéro de téléphone
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

    // Réserver le ticket
    ticket.status = TicketStatus.RESERVED;
    await this.ticketsRepository.save(ticket);

    try {
      const salePrice = this.getSalePrice(ticket);
      // Créer le paiement
      const payment = await this.paymentService.create(
        {
          amount: salePrice,
          method,
          phoneNumber: normalizedPhone,
          ticketId: ticket.id,
          notes: `Purchase of ticket ${ticket.username}`,
        },
        userId,
      );

      // Lier le paiement au ticket
      ticket.paymentId = payment.id;
      await this.ticketsRepository.save(ticket);

      // Décrypter le mot de passe pour l'exposer
      const decryptedPassword = await this.decryptPassword(ticket.password);

      this.logger.log(`purchase success ticketId=${ticketId}`);
      return {
        ticket: {
          ...ticket,
          password: '***', // Ne pas exposer dans le ticket
        } as Ticket,
        payment,
        credentials: {
          username: ticket.username,
          password: decryptedPassword,
          profile: ticket.profile,
          instructions:
            "Connectez-vous au Wi-Fi 'Club Internet Access' et utilisez ces identifiants pour vous authentifier.",
        },
      };
    } catch (error) {
      // En cas d'erreur, libérer le ticket
      ticket.status = TicketStatus.AVAILABLE;
      ticket.paymentId = null;
      await this.ticketsRepository.save(ticket);
      this.logger.warn(`purchase failed, ticket ${ticketId} released: ${error?.message}`);
      throw error;
    }
  }

  async reserve(id: string): Promise<Ticket> {
    this.logger.log(`reserve ticket id=${id}`);
    const ticket = await this.findOne(id);

    if (ticket.status !== TicketStatus.AVAILABLE) {
      throw new BadRequestException('Ticket is not available for reservation');
    }

    ticket.status = TicketStatus.RESERVED;
    return await this.ticketsRepository.save(ticket);
  }

  async release(id: string): Promise<Ticket> {
    this.logger.log(`release ticket id=${id}`);
    const ticket = await this.findOne(id);

    if (ticket.status !== TicketStatus.RESERVED) {
      throw new BadRequestException('Ticket is not reserved');
    }

    ticket.status = TicketStatus.AVAILABLE;
    ticket.paymentId = null;
    return await this.ticketsRepository.save(ticket);
  }

  async markAsSold(ticketId: string, phoneNumber: string): Promise<Ticket> {
    this.logger.log(`markAsSold ticketId=${ticketId} soldTo=${phoneNumber}`);
    const ticket = await this.findOne(ticketId);
    if (ticket.status === TicketStatus.SOLD) {
      this.logger.log(`markAsSold idempotent (déjà vendu) ticketId=${ticketId}`);
      return ticket;
    }
    ticket.status = TicketStatus.SOLD;
    ticket.soldAt = new Date();
    ticket.soldTo = phoneNumber;
    return await this.ticketsRepository.save(ticket);
  }

  async markAsFailed(ticketId: string): Promise<Ticket> {
    this.logger.log(`markAsFailed ticketId=${ticketId} (released)`);
    const ticket = await this.findOne(ticketId);
    if (ticket.status === TicketStatus.SOLD) {
      this.logger.warn(`markAsFailed: ticket ${ticketId} déjà vendu — pas de libération`);
      return ticket;
    }
    ticket.status = TicketStatus.AVAILABLE;
    ticket.paymentId = null;
    return await this.ticketsRepository.save(ticket);
  }

  /**
   * Succès Kelpay : vendre le ticket **dans la même transaction** que le paiement.
   * Pas d’étape `reserved` (évite ticket bloqué si l’étape suivante échoue ; le catalogue ne liste que `available`).
   */
  async claimTicketForSuccessfulKelpayPayment(
    manager: EntityManager,
    ticketId: string,
    paymentId: string,
    phoneNumber: string,
  ): Promise<void> {
    const ticketRepo = manager.getRepository(Ticket);
    const ticket = await ticketRepo.findOne({
      where: { id: ticketId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!ticket) {
      this.logger.warn(`claimTicketForSuccessfulKelpayPayment: ticket introuvable id=${ticketId}`);
      return;
    }
    if (ticket.status === TicketStatus.SOLD) {
      this.logger.debug(
        `claimTicketForSuccessfulKelpayPayment: ticket ${ticketId} déjà sold (idempotent)`,
      );
      return;
    }
    const reservedForThisPayment =
      ticket.status === TicketStatus.RESERVED && ticket.paymentId === paymentId;
    if (ticket.status !== TicketStatus.AVAILABLE && !reservedForThisPayment) {
      this.logger.warn(
        `claimTicketForSuccessfulKelpayPayment: ticket ${ticketId} status=${ticket.status} paymentId=${ticket.paymentId ?? 'none'} — attribution ignorée`,
      );
      return;
    }
    ticket.status = TicketStatus.SOLD;
    ticket.soldAt = new Date();
    ticket.soldTo = phoneNumber || '';
    ticket.paymentId = paymentId;
    await ticketRepo.save(ticket);
    this.logger.log(
      `claimTicketForSuccessfulKelpayPayment: ticket ${ticketId} → SOLD paymentId=${paymentId}`,
    );
  }

  /**
   * Mot de passe Wi‑Fi en clair — uniquement si le ticket est **vendu** (paiement finalisé).
   * Retourne `undefined` si le statut n’est pas `sold` ou si le déchiffrement échoue.
   */
  async getPlainPasswordForSoldTicket(ticket: Ticket): Promise<string | undefined> {
    if (ticket.status !== TicketStatus.SOLD) {
      return undefined;
    }
    try {
      return await this.decryptPassword(ticket.password);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`getPlainPasswordForSoldTicket ticketId=${ticket.id}: ${msg}`);
      return undefined;
    }
  }

  /**
   * Réponse API pour l’acheteur : mot de passe **en clair** si `sold`, sinon masqué.
   */
  async serializeTicketForOwner(ticket: Ticket): Promise<Ticket & { password: string }> {
    const plain = await this.getPlainPasswordForSoldTicket(ticket);
    return {
      ...ticket,
      password: plain ?? '***',
    };
  }

  async findForUser(userId: string): Promise<Ticket[]> {
    this.logger.log(`findForUser userId=${userId}`);
    return await this.ticketsRepository.find({
      where: {
        payment: {
          createdById: userId,
        } as any,
      },
      relations: ['ticketType', 'payment'],
      order: { createdAt: 'DESC' },
    });
  }

  async importFromCSV(
    csvContent: string,
    importDto?: ImportTicketsDto,
  ): Promise<{
    imported: number;
    failed: number;
    errors: string[];
  }> {
    const lineCount = csvContent.split('\n').length;
    const tid = importDto?.ticketTypeId?.trim();
    this.logger.log(
      `importFromCSV start lines≈${lineCount} ticketTypeId=${tid ?? '—'} catalogDuration=${importDto?.catalogDuration ?? 'auto'}`,
    );
    const errors: string[] = [];
    let imported = 0;
    let failed = 0;

    try {
      const records = this.parseCsvRecords(csvContent);
      if (records.length === 0) {
        errors.push('CSV vide');
        this.logger.warn('importFromCSV: CSV vide');
        return { imported: 0, failed: 0, errors };
      }

      let sharedTicketType: TicketType;
      if (tid) {
        const tt = await this.ticketTypesRepository.findOne({ where: { id: tid } });
        if (!tt) {
          errors.push(`TicketType introuvable (ticketTypeId=${tid})`);
          this.logger.warn(`importFromCSV: ticketTypeId invalide id=${tid}`);
          return { imported: 0, failed: 0, errors };
        }
        if (!tt.isActive) {
          errors.push(`TicketType inactif (ticketTypeId=${tid})`);
          this.logger.warn(`importFromCSV: ticketType inactif id=${tid}`);
          return { imported: 0, failed: 0, errors };
        }
        sharedTicketType = tt;
      } else if (importDto?.catalogDuration) {
        const cd = importDto.catalogDuration;
        const price = this.priceFromTimeLimit(this.getDurationTimeLimit(cd));
        sharedTicketType = await this.ensureTicketTypeForRecord(cd, null, null, price);
      } else {
        errors.push(
          'Fournissez ticketTypeId ou catalogDuration : le type de ticket ne peut pas être déduit des colonnes CSV (Time Limit / Data Limit ignorés pour le catalogue).',
        );
        this.logger.warn('importFromCSV: refus — ni ticketTypeId ni catalogDuration');
        return { imported: 0, failed: 0, errors };
      }

      for (const record of records) {
        try {
          const username = record.Username?.trim();
          const password = record.Password?.trim();
          const profile = record.Profile?.trim();
          const comment = record.Comment?.trim() || null;

          if (!username || !password || !profile) {
            errors.push(`Ligne invalide: ${JSON.stringify(record)}`);
            failed++;
            continue;
          }

          // Vérifier si le ticket existe déjà
          const existingTicket = await this.findOneByUsername(username);
          if (existingTicket) {
            errors.push(`Ticket ${username} existe déjà`);
            failed++;
            continue;
          }

          const ticketType = sharedTicketType;

          // Chiffrer le mot de passe
          const encryptedPassword = await this.encryptPassword(password);

          // Créer le ticket — timeLimit / dataLimit : uniquement depuis le TicketType (jamais le CSV)
          const ticket = this.ticketsRepository.create({
            username,
            password: encryptedPassword,
            profile,
            timeLimit: ticketType.timeLimit ?? null,
            dataLimit: ticketType.dataLimit ?? null,
            comment,
            status: TicketStatus.AVAILABLE,
            ticketTypeId: ticketType.id,
          });

          await this.ticketsRepository.save(ticket);
          imported++;
        } catch (error) {
          this.logger.error(
            `Erreur lors de l'import d'une ligne CSV: ${error?.message}`,
          );
          errors.push(`Erreur lors de l'import: ${error.message}`);
          failed++;
        }
      }
    } catch (error) {
      this.logger.error(`Erreur de parsing CSV: ${error?.message}`);
      errors.push(`Erreur de parsing CSV: ${error.message}`);
      failed++;
    }

    this.logger.log(
      `importFromCSV done imported=${imported} failed=${failed} errors=${errors.length}`,
    );
    return { imported, failed, errors };
  }

  async getImportTypeRecommendations(
    csvContent: string,
  ): Promise<CsvImportTypeRecommendationsResult> {
    const records = this.parseCsvRecords(csvContent);
    const byDuration = new Map<'24h' | '7j' | '30j', { count: number; sampleTimeLimit: string | null }>();

    for (const record of records) {
      const timeLimit = this.getRecordTimeLimit(record);
      const durationType = this.classifyTimeLimitDuration((timeLimit || '').trim() || '24h');
      if (!byDuration.has(durationType)) {
        byDuration.set(durationType, { count: 1, sampleTimeLimit: timeLimit });
      } else {
        byDuration.get(durationType)!.count += 1;
      }
    }

    const recommendations: CsvTypeRecommendation[] = [];
    for (const [durationType, info] of byDuration.entries()) {
      const durationProfile = this.getDurationProfile(durationType);
      const existing = await this.ticketTypesRepository.findOne({
        where: { profile: durationProfile },
      });
      const recommendedPrice = this.priceFromTimeLimit(info.sampleTimeLimit || '24h');

      recommendations.push({
        typeKey: durationType,
        typeLabel: this.getDurationLabel(durationType),
        count: info.count,
        sampleTimeLimit: info.sampleTimeLimit,
        recommendedPrice,
        action: existing ? 'use_existing' : 'create_new',
        matchedTicketType: existing
          ? {
              id: existing.id,
              name: existing.name,
              profile: existing.profile,
              price: Number(existing.price),
              timeLimit: existing.timeLimit ?? undefined,
              dataLimit: existing.dataLimit ?? undefined,
              isActive: existing.isActive,
            }
          : null,
      });
    }

    const order: Record<'24h' | '7j' | '30j', number> = { '24h': 1, '7j': 2, '30j': 3 };
    recommendations.sort((a, b) => order[a.typeKey] - order[b.typeKey]);
    return {
      summary: {
        totalRows: records.length,
        uniqueTypes: recommendations.length,
      },
      recommendations,
    };
  }

  async getStats(): Promise<{
    total: number;
    available: number;
    sold: number;
    reserved: number;
    revenue: number;
  }> {
    const [total, available, sold, reserved] = await Promise.all([
      this.ticketsRepository.count(),
      this.countCatalogAvailableTickets(),
      this.ticketsRepository.count({ where: { status: TicketStatus.SOLD } }),
      this.ticketsRepository.count({ where: { status: TicketStatus.RESERVED } }),
    ]);

    const soldTickets = await this.ticketsRepository.find({
      where: { status: TicketStatus.SOLD },
      relations: ['ticketType'],
    });

    const revenue = soldTickets.reduce(
      (sum, ticket) => sum + (ticket.ticketType ? Number(ticket.ticketType.price) : 0),
      0,
    );
    this.logger.log(`getStats total=${total} available=${available} sold=${sold} reserved=${reserved} revenue=${revenue}`);

    return {
      total,
      available,
      sold,
      reserved,
      revenue,
    };
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`remove ticket id=${id}`);
    const ticket = await this.findOne(id);
    await this.ticketsRepository.remove(ticket);
  }

  // Méthodes utilitaires

  /** Prix de vente : toujours celui du `TicketType` lié. */
  getSalePrice(ticket: Ticket): number {
    if (!ticket.ticketType) {
      throw new BadRequestException('Ticket sans type : impossible de déterminer le prix');
    }
    return Number(ticket.ticketType.price);
  }

  private normalizePhoneNumber(phone: string): string {
    // Normaliser au format +243900000000
    const cleaned = phone.replace(/\s+/g, '');
    if (cleaned.startsWith('+243')) {
      return cleaned;
    } else if (cleaned.startsWith('243')) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('0')) {
      return `+243${cleaned.substring(1)}`;
    }
    return `+243${cleaned}`;
  }

  private getEncryptionKey(): string {
    const key = (process.env.TICKET_ENCRYPTION_KEY ?? '').trim();
    if (!key) {
      throw new Error(
        'TICKET_ENCRYPTION_KEY doit être défini dans le fichier .env (chiffrement des mots de passe des tickets).',
      );
    }
    return key;
  }

  private encryptPassword(password: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.getEncryptionKey(), 'salt', 32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Stocker IV + password chiffré
    return iv.toString('hex') + ':' + encrypted;
  }

  private decryptPassword(encryptedPassword: string): string {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(this.getEncryptionKey(), 'salt', 32);
      const parts = encryptedPassword.split(':');

      if (parts.length !== 2) {
        throw new Error('Invalid encrypted password format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];

      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error(`Failed to decrypt password: ${error.message}`);
      throw new Error('Failed to decrypt password');
    }
  }

  /** En-têtes CSV / Excel : BOM, espaces, alias « TimeLimit », etc. */
  private canonicalImportHeader(raw: string): string {
    const h = raw.replace(/^\ufeff/, '').trim();
    const key = h.toLowerCase().replace(/\s+/g, '');
    const aliases: Record<string, string> = {
      username: 'Username',
      user: 'Username',
      password: 'Password',
      profile: 'Profile',
      timelimit: 'Time Limit',
      time_limit: 'Time Limit',
      datalimit: 'Data Limit',
      data_limit: 'Data Limit',
      comment: 'Comment',
    };
    return aliases[key] ?? h;
  }

  private getRecordTimeLimit(record: Record<string, unknown>): string | null {
    const direct = record['Time Limit'];
    if (typeof direct === 'string' && direct.trim() !== '') {
      return direct.trim();
    }
    for (const [k, v] of Object.entries(record)) {
      const nk = k.replace(/^\ufeff/, '').trim().toLowerCase().replace(/\s+/g, '');
      if ((nk === 'timelimit' || nk === 'time_limit') && typeof v === 'string' && v.trim() !== '') {
        return v.trim();
      }
    }
    return null;
  }

  private parseCsvRecords(csvContent: string): any[] {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      return [];
    }

    const headers = lines[0].split(',').map(h => this.canonicalImportHeader(h.trim()));
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const record: any = {};
      headers.forEach((header, index) => {
        record[header] = values[index] || '';
      });
      return record;
    });
  }

  private async ensureTicketTypeForRecord(
    durationType: '24h' | '7j' | '30j',
    timeLimit: string | null,
    dataLimit: string | null,
    price: number,
  ): Promise<TicketType> {
    const profile = this.getDurationProfile(durationType);
    const label = this.getDurationLabel(durationType);
    const existingType = await this.ticketTypesRepository.findOne({
      where: { profile },
    });
    if (existingType) {
      return existingType;
    }

    const created = this.ticketTypesRepository.create({
      name: label,
      profile,
      description: `Type auto-créé depuis import CSV (durée: ${label})`,
      timeLimit: this.getDurationTimeLimit(durationType) || timeLimit || null,
      dataLimit: dataLimit || null,
      price,
      isActive: true,
    });
    const saved = await this.ticketTypesRepository.save(created);
    this.logger.log(`TicketType auto-créé depuis CSV: duration=${durationType} id=${saved.id}`);
    return saved;
  }

  /**
   * Classe la valeur « Time Limit » Mikhmon / Excel vers un bucket catalogue.
   * Évite les faux positifs du type `includes('7')` (ex. `14d`, `17h`).
   */
  private classifyTimeLimitDuration(raw: string): '24h' | '7j' | '30j' {
    const s = (raw || '').trim().toLowerCase();
    const t = s.replace(/\s+/g, '');
    if (!t) return '24h';
    if (
      t === '30d' ||
      t === '30j' ||
      t.includes('30d') ||
      t.includes('30j') ||
      t.includes('720h') ||
      t === '1m' ||
      t.includes('1month') ||
      t.includes('30day')
    ) {
      return '30j';
    }
    if (
      t === '7d' ||
      t === '7j' ||
      t.includes('7d') ||
      t.includes('7j') ||
      t.includes('168h') ||
      t === '1w' ||
      t.includes('1week') ||
      t.includes('7day')
    ) {
      return '7j';
    }
    if (t.includes('30')) return '30j';
    if (t === '7' || t.startsWith('7d') || t.startsWith('7j')) return '7j';
    return '24h';
  }

  private getDurationLabel(durationType: '24h' | '7j' | '30j'): string {
    if (durationType === '30j') return '30 jours';
    if (durationType === '7j') return '7 jours';
    return '24 heures';
  }

  private getDurationProfile(durationType: '24h' | '7j' | '30j'): string {
    if (durationType === '30j') return 'DURATION_30J';
    if (durationType === '7j') return 'DURATION_7J';
    return 'DURATION_24H';
  }

  private getDurationTimeLimit(durationType: '24h' | '7j' | '30j'): string {
    if (durationType === '30j') return '30d';
    if (durationType === '7j') return '7d';
    return '24h';
  }
}
