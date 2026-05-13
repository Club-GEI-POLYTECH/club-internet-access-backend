import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(userData: Partial<User>): Promise<User> {
    this.logger.log(`create user email=${userData.email} role=${userData.role}`);
    // Hasher le mot de passe si fourni (comme dans register)
    if (userData.password) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      userData = {
        ...userData,
        password: hashedPassword,
      };
    }
    
    const user = this.usersRepository.create(userData);
    const saved = await this.usersRepository.save(user);
    this.logger.log(`user created id=${saved.id}`);
    return saved;
  }

  async findAll(): Promise<User[]> {
    this.logger.log('findAll users');
    return await this.usersRepository.find({
      relations: ['payments'],
    });
  }

  async findOne(id: string): Promise<User> {
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

  async update(id: string, userData: Partial<User>): Promise<User> {
    this.logger.log(`update user id=${id}`);
    // Hasher le mot de passe si fourni dans la mise à jour
    if (userData.password) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      userData = {
        ...userData,
        password: hashedPassword,
      };
    }
    
    await this.usersRepository.update(id, userData);
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

