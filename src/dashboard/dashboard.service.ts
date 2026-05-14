import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../entities/payment.entity';
import { User, UserRole } from '../entities/user.entity';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { andCatalogAvailableForTicket } from '../tickets/catalog-available.query';

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
  ) {}

  async getDashboardStats() {
    this.logger.log('getDashboardStats');
    const [
      totalPayments,
      completedPayments,
      pendingPayments,
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
      this.paymentsRepository.count({
        where: { status: In([PaymentStatus.PENDING, PaymentStatus.PROCESSING]) },
      }),
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

    const [recentPayments, recentUsers] = await Promise.all([
      this.paymentsRepository.find({
        take: 15,
        order: { createdAt: 'DESC' },
        relations: ['ticket', 'createdBy'],
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
    ]);

    return {
      payments: {
        total: totalPayments,
        completed: completedPayments,
        pending: pendingPayments,
        failed: failedPayments,
        revenue: parseFloat(totalRevenue?.total || '0'),
      },
      tickets: {
        total: ticketsTotal,
        available: ticketsAvailable,
        sold: ticketsSold,
        reserved: ticketsReserved,
        revenue: parseFloat(ticketsRevenue?.total || '0'),
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
