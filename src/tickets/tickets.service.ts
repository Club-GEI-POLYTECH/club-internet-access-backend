import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { TicketType } from '../entities/ticket-type.entity';
import { Payment, PaymentStatus, PaymentMethod } from '../entities/payment.entity';
import { PaymentService } from '../payment/payment.service';
import * as crypto from 'crypto';
// csv-parse sera installé via npm install csv-parse
// Pour l'instant, on utilise une implémentation simple de parsing CSV

@Injectable()
export class TicketsService implements OnModuleInit {
  private readonly logger = new Logger(TicketsService.name);

  // Prix par défaut selon le profil
  private readonly DEFAULT_PRICES: Record<string, number> = {
    TEST: 5000,
    BASIC: 10000,
    PREMIUM: 20000,
  };

  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    @InjectRepository(TicketType)
    private ticketTypesRepository: Repository<TicketType>,
    private paymentService: PaymentService,
  ) {}

  async onModuleInit() {
    // Écouter les changements de statut des paiements pour marquer les tickets comme vendus
    // Cette logique peut être implémentée via un webhook ou un événement
    this.logger.log('✅ TicketsService initialized');
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
    return await this.findAll(TicketStatus.AVAILABLE);
  }

  async findAvailableByType(typeId: string): Promise<Ticket[]> {
    return await this.ticketsRepository.find({
      where: {
        status: TicketStatus.AVAILABLE,
        ticketTypeId: typeId,
      },
      relations: ['ticketType'],
      order: { createdAt: 'DESC' },
    });
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
  ): Promise<{ ticket: Ticket; payment: Payment; credentials: any }> {
    this.logger.log(`purchase ticketId=${ticketId} phone=${phoneNumber} method=${method}`);
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
      // Créer le paiement
      const payment = await this.paymentService.create(
        {
          amount: ticket.price,
          method,
          phoneNumber: normalizedPhone,
          ticketId: ticket.id,
          notes: `Purchase of ticket ${ticket.username}`,
        },
        undefined, // Pas d'utilisateur connecté pour les achats publics
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
    ticket.status = TicketStatus.SOLD;
    ticket.soldAt = new Date();
    ticket.soldTo = phoneNumber;
    return await this.ticketsRepository.save(ticket);
  }

  async markAsFailed(ticketId: string): Promise<Ticket> {
    this.logger.log(`markAsFailed ticketId=${ticketId} (released)`);
    const ticket = await this.findOne(ticketId);
    ticket.status = TicketStatus.AVAILABLE;
    ticket.paymentId = null;
    return await this.ticketsRepository.save(ticket);
  }

  async importFromCSV(csvContent: string, defaultPrice?: number): Promise<{
    imported: number;
    failed: number;
    errors: string[];
  }> {
    this.logger.log(`importFromCSV lines≈${csvContent.split('\n').length} defaultPrice=${defaultPrice ?? 'none'}`);
    const errors: string[] = [];
    let imported = 0;
    let failed = 0;

    try {
      // Parser CSV simple (ou utiliser csv-parse si installé)
      const lines = csvContent.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        errors.push('CSV vide');
        this.logger.warn('importFromCSV: CSV vide');
        return { imported: 0, failed: 0, errors };
      }

      // Première ligne = headers
      const headers = lines[0].split(',').map(h => h.trim());
      const records = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const record: any = {};
        headers.forEach((header, index) => {
          record[header] = values[index] || '';
        });
        return record;
      });

      for (const record of records) {
        try {
          const username = record.Username?.trim();
          const password = record.Password?.trim();
          const profile = record.Profile?.trim();
          const timeLimit = record['Time Limit']?.trim() || null;
          const dataLimit = record['Data Limit']?.trim() || null;
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

          // Déterminer le prix
          let price = defaultPrice || this.DEFAULT_PRICES[profile] || 5000;

          // Chercher un type de ticket correspondant
          let ticketType = await this.ticketTypesRepository.findOne({
            where: { profile, isActive: true },
          });

          if (ticketType) {
            price = ticketType.price;
          }

          // Chiffrer le mot de passe
          const encryptedPassword = await this.encryptPassword(password);

          // Créer le ticket
          const ticket = this.ticketsRepository.create({
            username,
            password: encryptedPassword,
            profile,
            timeLimit: timeLimit || null,
            dataLimit: dataLimit || null,
            comment,
            status: TicketStatus.AVAILABLE,
            price,
            ticketTypeId: ticketType?.id || null,
          });

          await this.ticketsRepository.save(ticket);
          imported++;
        } catch (error) {
          errors.push(`Erreur lors de l'import: ${error.message}`);
          failed++;
        }
      }
    } catch (error) {
      errors.push(`Erreur de parsing CSV: ${error.message}`);
      failed++;
    }

    this.logger.log(`importFromCSV done imported=${imported} failed=${failed} errors=${errors.length}`);
    return { imported, failed, errors };
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
      this.ticketsRepository.count({ where: { status: TicketStatus.AVAILABLE } }),
      this.ticketsRepository.count({ where: { status: TicketStatus.SOLD } }),
      this.ticketsRepository.count({ where: { status: TicketStatus.RESERVED } }),
    ]);

    const soldTickets = await this.ticketsRepository.find({
      where: { status: TicketStatus.SOLD },
      select: ['price'],
    });

    const revenue = soldTickets.reduce((sum, ticket) => sum + Number(ticket.price), 0);
    this.logger.log(`getStats total=${total} available=${available} sold=${sold} reserved=${reserved} revenue=${revenue}`);

    return {
      total,
      available,
      sold,
      reserved,
      revenue,
    };
  }

  async updatePrice(id: string, price: number): Promise<Ticket> {
    this.logger.log(`updatePrice id=${id} price=${price}`);
    const ticket = await this.findOne(id);
    ticket.price = price;
    return await this.ticketsRepository.save(ticket);
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`remove ticket id=${id}`);
    const ticket = await this.findOne(id);
    await this.ticketsRepository.remove(ticket);
  }

  // Méthodes utilitaires

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
    // Utiliser une clé depuis les variables d'environnement ou une clé par défaut
    // En production, utilisez une clé sécurisée depuis les variables d'environnement
    return process.env.TICKET_ENCRYPTION_KEY || 'default-encryption-key-change-in-production-32chars!!';
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
}
