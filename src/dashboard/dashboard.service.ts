import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { User, UserRole } from '../entities/user.entity';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { TicketType } from '../entities/ticket-type.entity';
import { andCatalogAvailableForTicket } from '../tickets/catalog-available.query';

export interface DashboardTicketTypeStats {
  ticketTypeId: string;
  name: string;
  profile: string;
  price: number;
  timeLimit?: string;
  total: number;
  available: number;
  sold: number;
  reserved: number;
  revenue: number;
}

export interface DashboardRecentTicketSummary {
  id: string;
  username: string;
  profile: string;
  status: TicketStatus;
  timeLimit?: string;
  soldAt?: Date;
  soldTo?: string;
  ticketTypeId?: string;
  ticketType?: Pick<TicketType, 'id' | 'name' | 'profile' | 'price' | 'timeLimit'>;
  createdAt: Date;
}

type StatusCountRow = { ticketTypeId: string | null; status: TicketStatus; cnt: string };
type AvailableCountRow = { ticketTypeId: string | null; cnt: string };
type RevenueRow = { ticketTypeId: string | null; total: string };

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    @InjectRepository(TicketType)
    private ticketTypesRepository: Repository<TicketType>,
  ) {}

  private normalizePaymentAmount(value: unknown): number {
    const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
    return Number.isFinite(n) ? n : 0;
  }

  private statusCountMap(rows: StatusCountRow[]): Map<string, Map<TicketStatus, number>> {
    const map = new Map<string, Map<TicketStatus, number>>();
    for (const row of rows) {
      const key = row.ticketTypeId ?? '';
      if (!map.has(key)) map.set(key, new Map());
      map.get(key)!.set(row.status, parseInt(row.cnt, 10) || 0);
    }
    return map;
  }

  private availableCountMap(rows: AvailableCountRow[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.ticketTypeId ?? '', parseInt(row.cnt, 10) || 0);
    }
    return map;
  }

  private revenueMap(rows: RevenueRow[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.ticketTypeId ?? '', parseFloat(row.total || '0') || 0);
    }
    return map;
  }

  private countForStatus(
    statusMap: Map<TicketStatus, number> | undefined,
    status: TicketStatus,
  ): number {
    return statusMap?.get(status) ?? 0;
  }

  private async buildTicketsByType(): Promise<DashboardTicketTypeStats[]> {
    const types = await this.ticketTypesRepository.find({
      order: { price: 'ASC', name: 'ASC' },
    });

    const [statusRows, availableRows, revenueRows] = await Promise.all([
      this.ticketsRepository
        .createQueryBuilder('ticket')
        .select('ticket.ticketTypeId', 'ticketTypeId')
        .addSelect('ticket.status', 'status')
        .addSelect('COUNT(*)', 'cnt')
        .groupBy('ticket.ticketTypeId')
        .addGroupBy('ticket.status')
        .getRawMany<StatusCountRow>(),
      andCatalogAvailableForTicket(this.ticketsRepository.createQueryBuilder('ticket'))
        .select('ticket.ticketTypeId', 'ticketTypeId')
        .addSelect('COUNT(*)', 'cnt')
        .groupBy('ticket.ticketTypeId')
        .getRawMany<AvailableCountRow>(),
      this.ticketsRepository
        .createQueryBuilder('ticket')
        .innerJoin('ticket.ticketType', 'tt')
        .select('ticket.ticketTypeId', 'ticketTypeId')
        .addSelect('SUM(tt.price)', 'total')
        .where('ticket.status = :status', { status: TicketStatus.SOLD })
        .groupBy('ticket.ticketTypeId')
        .getRawMany<RevenueRow>(),
    ]);

    const byStatus = this.statusCountMap(statusRows);
    const byAvailable = this.availableCountMap(availableRows);
    const byRevenue = this.revenueMap(revenueRows);

    const byType: DashboardTicketTypeStats[] = types.map((type) => {
      const statusMap = byStatus.get(type.id);
      const sold = this.countForStatus(statusMap, TicketStatus.SOLD);
      const reserved = this.countForStatus(statusMap, TicketStatus.RESERVED);
      const available = byAvailable.get(type.id) ?? 0;
      const total =
        (statusMap ? [...statusMap.values()].reduce((a, b) => a + b, 0) : 0) || 0;

      return {
        ticketTypeId: type.id,
        name: type.name,
        profile: type.profile,
        price: Number(type.price),
        timeLimit: type.timeLimit ?? undefined,
        total,
        available,
        sold,
        reserved,
        revenue: byRevenue.get(type.id) ?? 0,
      };
    });

    const untypedStatus = byStatus.get('');
    const untypedTotal = untypedStatus
      ? [...untypedStatus.values()].reduce((a, b) => a + b, 0)
      : 0;

    if (untypedTotal > 0) {
      byType.push({
        ticketTypeId: '',
        name: 'Sans type',
        profile: '—',
        price: 0,
        timeLimit: undefined,
        total: untypedTotal,
        available: byAvailable.get('') ?? 0,
        sold: this.countForStatus(untypedStatus, TicketStatus.SOLD),
        reserved: this.countForStatus(untypedStatus, TicketStatus.RESERVED),
        revenue: byRevenue.get('') ?? 0,
      });
    }

    return byType;
  }

  private mapRecentTicketsForDashboard(tickets: Ticket[]): DashboardRecentTicketSummary[] {
    return tickets.map((t) => ({
      id: t.id,
      username: t.username,
      profile: t.profile,
      status: t.status,
      timeLimit: t.timeLimit ?? undefined,
      soldAt: t.soldAt ?? undefined,
      soldTo: t.soldTo ?? undefined,
      ticketTypeId: t.ticketTypeId ?? undefined,
      ticketType: t.ticketType
        ? {
            id: t.ticketType.id,
            name: t.ticketType.name,
            profile: t.ticketType.profile,
            price: Number(t.ticketType.price),
            timeLimit: t.ticketType.timeLimit ?? undefined,
          }
        : undefined,
      createdAt: t.createdAt,
    }));
  }

  private maskTicketForDashboard(ticket: Ticket): Ticket {
    return { ...ticket, password: '***' } as Ticket;
  }

  private serializePaymentForDashboard(p: Payment, ticket?: Ticket | null): Payment {
    const normalized: Payment = {
      ...p,
      amount: this.normalizePaymentAmount(p.amount),
    };
    if (ticket) {
      const masked = this.maskTicketForDashboard(ticket);
      if (masked.ticketType) {
        masked.ticketType = {
          ...masked.ticketType,
          price: this.normalizePaymentAmount(masked.ticketType.price) as unknown as TicketType['price'],
        };
      }
      normalized.ticket = masked;
    }
    return normalized;
  }

  /** Masque le mot de passe ticket et charge les tickets manquants en batch. */
  private async enrichRecentPayments(payments: Payment[]): Promise<Payment[]> {
    const missingIds = [
      ...new Set(
        payments.filter((p) => !p.ticket && p.ticketId).map((p) => p.ticketId as string),
      ),
    ];

    const ticketById = new Map<string, Ticket>();
    if (missingIds.length > 0) {
      const loaded = await this.ticketsRepository.find({
        where: { id: In(missingIds) },
        relations: ['ticketType'],
      });
      for (const t of loaded) {
        ticketById.set(t.id, t);
      }
    }

    return payments.map((p) => {
      const ticket = p.ticket ?? (p.ticketId ? ticketById.get(p.ticketId) : undefined);
      return this.serializePaymentForDashboard(p, ticket);
    });
  }

  async getDashboardStats() {
    this.logger.log('getDashboardStats');
    const [
      totalPayments,
      completedPayments,
      pendingPayments,
      processingPayments,
      cancelledPayments,
      failedPayments,
      totalRevenue,
      totalUsers,
      activeUsers,
      inactiveUsers,
      usersByRoleRows,
      ticketsTotal,
      ticketsAvailable,
      ticketsSold,
      ticketsReserved,
      ticketsRevenue,
    ] = await Promise.all([
      this.paymentsRepository.count(),
      this.paymentsRepository.count({
        where: { status: In([PaymentStatus.COMPLETED, PaymentStatus.SUCCESS]) },
      }),
      this.paymentsRepository.count({ where: { status: PaymentStatus.PENDING } }),
      this.paymentsRepository.count({ where: { status: PaymentStatus.PROCESSING } }),
      this.paymentsRepository.count({ where: { status: PaymentStatus.CANCELLED } }),
      this.paymentsRepository.count({
        where: { status: In([PaymentStatus.FAILED, PaymentStatus.EXPIRED]) },
      }),
      this.paymentsRepository
        .createQueryBuilder('payment')
        .select('SUM(payment.amount)', 'total')
        .where('payment.status IN (:...paid)', {
          paid: [PaymentStatus.COMPLETED, PaymentStatus.SUCCESS],
        })
        .getRawOne(),
      this.usersRepository.count(),
      this.usersRepository.count({ where: { isActive: true } }),
      this.usersRepository.count({ where: { isActive: false } }),
      this.usersRepository
        .createQueryBuilder('user')
        .select('user.role', 'role')
        .addSelect('COUNT(*)', 'count')
        .groupBy('user.role')
        .getRawMany(),
      this.ticketsRepository.count(),
      andCatalogAvailableForTicket(this.ticketsRepository.createQueryBuilder('ticket')).getCount(),
      this.ticketsRepository.count({ where: { status: TicketStatus.SOLD } }),
      this.ticketsRepository.count({ where: { status: TicketStatus.RESERVED } }),
      this.ticketsRepository
        .createQueryBuilder('ticket')
        .innerJoin('ticket.ticketType', 'tt')
        .select('SUM(tt.price)', 'total')
        .where('ticket.status = :status', { status: TicketStatus.SOLD })
        .getRawOne(),
    ]);

    const byRole = { admin: 0, agent: 0, student: 0 };
    for (const row of usersByRoleRows as { role: UserRole; count: string }[]) {
      const n = parseInt(row.count, 10) || 0;
      if (row.role === UserRole.ADMIN) byRole.admin = n;
      else if (row.role === UserRole.AGENT) byRole.agent = n;
      else if (row.role === UserRole.STUDENT) byRole.student = n;
    }

    const [byTicketType, recentPaymentsRaw, recentUsers, recentTicketsRaw] = await Promise.all([
      this.buildTicketsByType(),
      this.paymentsRepository.find({
        take: 15,
        order: { createdAt: 'DESC' },
        relations: ['ticket', 'ticket.ticketType', 'createdBy'],
      }),
      this.usersRepository
        .createQueryBuilder('user')
        .select([
          'user.id',
          'user.email',
          'user.firstName',
          'user.lastName',
          'user.role',
          'user.isActive',
          'user.phone',
          'user.createdAt',
        ])
        .orderBy('user.createdAt', 'DESC')
        .take(15)
        .getMany(),
      this.ticketsRepository.find({
        take: 15,
        order: { createdAt: 'DESC' },
        relations: ['ticketType'],
      }),
    ]);

    const recentPayments = await this.enrichRecentPayments(recentPaymentsRaw);
    const recentTickets = this.mapRecentTicketsForDashboard(recentTicketsRaw);

    return {
      payments: {
        total: totalPayments,
        completed: completedPayments,
        pending: pendingPayments,
        processing: processingPayments,
        cancelled: cancelledPayments,
        failed: failedPayments,
        revenue: parseFloat(totalRevenue?.total || '0'),
      },
      tickets: {
        total: ticketsTotal,
        available: ticketsAvailable,
        sold: ticketsSold,
        reserved: ticketsReserved,
        revenue: parseFloat(ticketsRevenue?.total || '0'),
        byTicketType,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        byRole,
      },
      recent: {
        payments: recentPayments,
        users: recentUsers,
        tickets: recentTickets,
      },
    };
  }

  async getMyStats(userId: string) {
    this.logger.log(`getMyStats userId=${userId}`);
    const paymentsCount = await this.paymentsRepository.count({
      where: { createdById: userId },
    });
    return { paymentsCount };
  }

  async getChartData(days: number = 7) {
    this.logger.log(`getChartData days=${days}`);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const paymentsByDay = await this.paymentsRepository
      .createQueryBuilder('payment')
      .select('DATE(payment.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(payment.amount)', 'revenue')
      .where('payment.createdAt >= :startDate', { startDate })
      .andWhere('payment.status IN (:...paid)', {
        paid: [PaymentStatus.COMPLETED, PaymentStatus.SUCCESS],
      })
      .groupBy('DATE(payment.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const ticketsSoldByDay = await this.ticketsRepository
      .createQueryBuilder('ticket')
      .select('DATE(ticket.soldAt)', 'date')
      .addSelect('COUNT(*)', 'sold')
      .where('ticket.soldAt IS NOT NULL')
      .andWhere('ticket.soldAt >= :startDate', { startDate })
      .andWhere('ticket.status = :status', { status: TicketStatus.SOLD })
      .groupBy('DATE(ticket.soldAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      payments: paymentsByDay,
      ticketsSold: ticketsSoldByDay,
    };
  }
}
