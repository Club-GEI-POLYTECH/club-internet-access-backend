import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WiFiAccount } from '../entities/wifi-account.entity';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { Session } from '../entities/session.entity';
import { User } from '../entities/user.entity';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { MikroTikService } from '../mikrotik/mikrotik.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectRepository(WiFiAccount)
    private wifiAccountsRepository: Repository<WiFiAccount>,
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    private mikrotikService: MikroTikService,
  ) {}

  async getDashboardStats() {
    this.logger.log('getDashboardStats');
    const [
      totalAccounts,
      activeAccounts,
      expiredAccounts,
      totalPayments,
      completedPayments,
      pendingPayments,
      failedPayments,
      totalRevenue,
      totalSessions,
      activeSessions,
      totalUsers,
      activeUsers,
      ticketsTotal,
      ticketsAvailable,
      ticketsSold,
      ticketsRevenue,
    ] = await Promise.all([
      this.wifiAccountsRepository.count(),
      this.wifiAccountsRepository.count({ where: { isActive: true, isExpired: false } }),
      this.wifiAccountsRepository.count({ where: { isExpired: true } }),
      this.paymentsRepository.count(),
      this.paymentsRepository.count({ where: { status: PaymentStatus.COMPLETED } }),
      this.paymentsRepository.count({ where: { status: PaymentStatus.PENDING } }),
      this.paymentsRepository.count({ where: { status: PaymentStatus.FAILED } }),
      this.paymentsRepository
        .createQueryBuilder('payment')
        .select('SUM(payment.amount)', 'total')
        .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
        .getRawOne(),
      this.sessionsRepository.count(),
      this.sessionsRepository.count({ where: { isActive: true } }),
      this.usersRepository.count(),
      this.usersRepository.count({ where: { isActive: true } }),
      this.ticketsRepository.count(),
      this.ticketsRepository.count({ where: { status: TicketStatus.AVAILABLE } }),
      this.ticketsRepository.count({ where: { status: TicketStatus.SOLD } }),
      this.ticketsRepository
        .createQueryBuilder('ticket')
        .select('SUM(ticket.price)', 'total')
        .where('ticket.status = :status', { status: TicketStatus.SOLD })
        .getRawOne(),
    ]);

    // Get MikroTik active users separately to handle errors gracefully
    let mikrotikActiveUsers: any[] = [];
    try {
      mikrotikActiveUsers = await this.mikrotikService.getActiveUsers();
    } catch (error) {
      // Silently fail if MikroTik is not available
    }

    const totalBytes = await this.sessionsRepository
      .createQueryBuilder('session')
      .select('SUM(session.bytesIn + session.bytesOut)', 'total')
      .getRawOne();

    // Recent activity
    const recentAccounts = await this.wifiAccountsRepository.find({
      take: 10,
      order: { createdAt: 'DESC' },
      relations: ['createdBy'],
    });

    const recentPayments = await this.paymentsRepository.find({
      take: 10,
      order: { createdAt: 'DESC' },
      relations: ['wifiAccount', 'createdBy'],
    });

    return {
      accounts: {
        total: totalAccounts,
        active: activeAccounts,
        expired: expiredAccounts,
      },
      payments: {
        total: totalPayments,
        completed: completedPayments,
        pending: pendingPayments,
        failed: failedPayments,
        revenue: parseFloat(totalRevenue?.total || '0'),
      },
      sessions: {
        total: totalSessions,
        active: activeSessions,
        mikrotikActive: Array.isArray(mikrotikActiveUsers) ? mikrotikActiveUsers.length : 0,
        totalBytesTransferred: parseInt(totalBytes?.total || '0'),
      },
      users: {
        total: totalUsers,
        active: activeUsers,
      },
      tickets: {
        total: ticketsTotal,
        available: ticketsAvailable,
        sold: ticketsSold,
        revenue: parseFloat(ticketsRevenue?.total || '0'),
      },
      recent: {
        accounts: recentAccounts,
        payments: recentPayments,
      },
    };
  }

  async getMyStats(userId: string) {
    this.logger.log(`getMyStats userId=${userId}`);
    const [wifiAccountsCount, paymentsCount] = await Promise.all([
      this.wifiAccountsRepository.count({ where: { createdById: userId } }),
      this.paymentsRepository.count({ where: { createdById: userId } }),
    ]);
    return {
      wifiAccountsCount,
      paymentsCount,
    };
  }

  async getChartData(days: number = 7) {
    this.logger.log(`getChartData days=${days}`);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Accounts created and expired per day
    const accountsByDay = await this.wifiAccountsRepository
      .createQueryBuilder('account')
      .select('DATE(account.createdAt)', 'date')
      .addSelect('COUNT(*)', 'created')
      .where('account.createdAt >= :startDate', { startDate })
      .groupBy('DATE(account.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const expiredByDay = await this.wifiAccountsRepository
      .createQueryBuilder('account')
      .select('DATE(account.updatedAt)', 'date')
      .addSelect('COUNT(*)', 'expired')
      .where('account.updatedAt >= :startDate', { startDate })
      .andWhere('account.isExpired = :isExpired', { isExpired: true })
      .groupBy('DATE(account.updatedAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    // Merge accounts data
    const accountsMap = new Map();
    accountsByDay.forEach(item => {
      accountsMap.set(item.date, { date: item.date, created: parseInt(item.created), expired: 0 });
    });
    expiredByDay.forEach(item => {
      if (accountsMap.has(item.date)) {
        accountsMap.get(item.date).expired = parseInt(item.expired);
      } else {
        accountsMap.set(item.date, { date: item.date, created: 0, expired: parseInt(item.expired) });
      }
    });
    const accountsData = Array.from(accountsMap.values());

    // Payments per day
    const paymentsByDay = await this.paymentsRepository
      .createQueryBuilder('payment')
      .select('DATE(payment.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(payment.amount)', 'revenue')
      .where('payment.createdAt >= :startDate', { startDate })
      .andWhere('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .groupBy('DATE(payment.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    // Sessions per day
    const sessionsByDay = await this.sessionsRepository
      .createQueryBuilder('session')
      .select('DATE(session.createdAt)', 'date')
      .addSelect('COUNT(*)', 'new')
      .where('session.createdAt >= :startDate', { startDate })
      .groupBy('DATE(session.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const activeSessionsByDay = await this.sessionsRepository
      .createQueryBuilder('session')
      .select('DATE(session.updatedAt)', 'date')
      .addSelect('COUNT(*)', 'active')
      .where('session.updatedAt >= :startDate', { startDate })
      .andWhere('session.isActive = :isActive', { isActive: true })
      .groupBy('DATE(session.updatedAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

    // Merge sessions data
    const sessionsMap = new Map();
    sessionsByDay.forEach(item => {
      sessionsMap.set(item.date, { date: item.date, new: parseInt(item.new), active: 0 });
    });
    activeSessionsByDay.forEach(item => {
      if (sessionsMap.has(item.date)) {
        sessionsMap.get(item.date).active = parseInt(item.active);
      } else {
        sessionsMap.set(item.date, { date: item.date, new: 0, active: parseInt(item.active) });
      }
    });
    const sessionsData = Array.from(sessionsMap.values());

    return {
      accounts: accountsData,
      payments: paymentsByDay,
      sessions: sessionsData,
    };
  }
}

