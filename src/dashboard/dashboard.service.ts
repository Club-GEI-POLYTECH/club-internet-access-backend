import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WiFiAccount } from '../entities/wifi-account.entity';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { Session } from '../entities/session.entity';
import { User } from '../entities/user.entity';
import { MikroTikService } from '../mikrotik/mikrotik.service';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(WiFiAccount)
    private wifiAccountsRepository: Repository<WiFiAccount>,
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private mikrotikService: MikroTikService,
  ) {}

  async getDashboardStats() {
    const [
      totalAccounts,
      activeAccounts,
      expiredAccounts,
      totalPayments,
      completedPayments,
      totalRevenue,
      totalSessions,
      activeSessions,
      totalUsers,
    ] = await Promise.all([
      this.wifiAccountsRepository.count(),
      this.wifiAccountsRepository.count({ where: { isActive: true, isExpired: false } }),
      this.wifiAccountsRepository.count({ where: { isExpired: true } }),
      this.paymentsRepository.count(),
      this.paymentsRepository.count({ where: { status: PaymentStatus.COMPLETED } }),
      this.paymentsRepository
        .createQueryBuilder('payment')
        .select('SUM(payment.amount)', 'total')
        .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
        .getRawOne(),
      this.sessionsRepository.count(),
      this.sessionsRepository.count({ where: { isActive: true } }),
      this.usersRepository.count(),
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
      },
      recent: {
        accounts: recentAccounts,
        payments: recentPayments,
      },
    };
  }

  async getChartData(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Accounts created per day
    const accountsByDay = await this.wifiAccountsRepository
      .createQueryBuilder('account')
      .select('DATE(account.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('account.createdAt >= :startDate', { startDate })
      .groupBy('DATE(account.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();

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

    return {
      accounts: accountsByDay,
      payments: paymentsByDay,
    };
  }
}

