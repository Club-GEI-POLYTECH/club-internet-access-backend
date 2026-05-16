import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { Payment } from '../entities/payment.entity';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import {
  buildPaginationMeta,
  PaginatedResult,
} from '../common/interfaces/paginated-result.interface';
import { toUserListItem, UserListItem } from './users-list.types';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const email = dto.email.trim().toLowerCase();
    const role = dto.role ?? UserRole.AGENT;
    this.logger.log(`create user email=${email} role=${role}`);
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      role,
      isActive: true,
    });
    const saved = await this.usersRepository.save(user);
    this.logger.log(`user created id=${saved.id}`);
    return saved;
  }

  async findAllPaginated(query: ListUsersQueryDto): Promise<PaginatedResult<UserListItem>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const paymentsLimit = query.paymentsLimit ?? 10;
    const skip = (page - 1) * limit;

    this.logger.log(
      `findAllPaginated page=${page} limit=${limit} paymentsLimit=${paymentsLimit} role=${query.role ?? 'all'}`,
    );

    const qb = this.usersRepository
      .createQueryBuilder('user')
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    const search = query.search?.trim();
    if (search) {
      qb.andWhere(
        '(LOWER(user.email) LIKE :search OR LOWER(user.firstName) LIKE :search OR LOWER(user.lastName) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    const [users, total] = await qb.getManyAndCount();

    if (users.length === 0) {
      return { data: [], meta: buildPaginationMeta(page, limit, total) };
    }

    const userIds = users.map((u) => u.id);
    const paymentsTotalByUser = await this.countPaymentsByUserIds(userIds);

    let paymentsByUser = new Map<string, Payment[]>();
    if (paymentsLimit > 0) {
      paymentsByUser = await this.loadRecentPaymentsForUsers(userIds, paymentsLimit);
    }

    const data = users.map((user) =>
      toUserListItem(
        user,
        paymentsByUser.get(user.id) ?? [],
        paymentsTotalByUser.get(user.id) ?? 0,
      ),
    );

    return {
      data,
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  private async countPaymentsByUserIds(userIds: string[]): Promise<Map<string, number>> {
    const rows = await this.paymentsRepository
      .createQueryBuilder('payment')
      .select('payment.createdById', 'userId')
      .addSelect('COUNT(*)', 'cnt')
      .where('payment.createdById IN (:...userIds)', { userIds })
      .groupBy('payment.createdById')
      .getRawMany<{ userId: string; cnt: string }>();

    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.userId, parseInt(row.cnt, 10) || 0);
    }
    return map;
  }

  /** Derniers paiements par utilisateur (fenêtre SQL, max `perUser` par compte). */
  private async loadRecentPaymentsForUsers(
    userIds: string[],
    perUser: number,
  ): Promise<Map<string, Payment[]>> {
    const payments = await this.paymentsRepository
      .createQueryBuilder('payment')
      .where(
        `payment.id IN (
          SELECT sub.id FROM (
            SELECT p.id,
              ROW_NUMBER() OVER (PARTITION BY p."createdById" ORDER BY p."createdAt" DESC) AS rn
            FROM payments p
            WHERE p."createdById" IN (:...userIds)
          ) sub
          WHERE sub.rn <= :perUser
        )`,
        { userIds, perUser },
      )
      .orderBy('payment.createdAt', 'DESC')
      .getMany();

    const grouped = new Map<string, Payment[]>();
    for (const payment of payments) {
      const uid = payment.createdById;
      if (!uid) continue;
      const list = grouped.get(uid) ?? [];
      list.push(payment);
      grouped.set(uid, list);
    }
    return grouped;
  }

  async findOne(id: string): Promise<User | null> {
    this.logger.log(`findOne user id=${id}`);
    return await this.usersRepository.findOne({
      where: { id },
      relations: ['payments'],
    });
  }

  async findByEmail(email: string): Promise<User> {
    return await this.usersRepository.findOne({
      where: { email },
    });
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    this.logger.log(`update user id=${id}`);
    const patch: Partial<User> = {};
    if (dto.email !== undefined) {
      patch.email = dto.email.trim().toLowerCase();
    }
    if (dto.firstName !== undefined) {
      patch.firstName = dto.firstName;
    }
    if (dto.lastName !== undefined) {
      patch.lastName = dto.lastName;
    }
    if (dto.phone !== undefined) {
      patch.phone = dto.phone;
    }
    if (dto.role !== undefined) {
      patch.role = dto.role;
    }
    if (dto.isActive !== undefined) {
      patch.isActive = dto.isActive;
    }
    if (dto.password !== undefined) {
      patch.password = await bcrypt.hash(dto.password, 10);
    }
    if (Object.keys(patch).length === 0) {
      return await this.findOne(id);
    }
    await this.usersRepository.update(id, patch);
    return await this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`remove user id=${id}`);
    await this.usersRepository.delete(id);
  }

  async updatePassword(id: string, newPassword: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.update(id, { password: hashedPassword });
    return await this.findOne(id);
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return await bcrypt.compare(password, user.password);
  }

  /** Crée un étudiant avec mot de passe déjà hashé (après vérification email). */
  async createStudentWithPasswordHash(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    phone?: string | null;
  }): Promise<User> {
    this.logger.log(`createStudentWithPasswordHash email=${data.email}`);
    const user = this.usersRepository.create({
      email: data.email,
      password: data.passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone ?? undefined,
      role: UserRole.STUDENT,
      isActive: true,
    });
    const saved = await this.usersRepository.save(user);
    this.logger.log(`student created id=${saved.id}`);
    return saved;
  }
}

