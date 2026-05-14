import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
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

  async findAll(): Promise<User[]> {
    this.logger.log('findAll users');
    return await this.usersRepository.find({
      relations: ['payments'],
      order: { createdAt: 'DESC' },
    });
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

