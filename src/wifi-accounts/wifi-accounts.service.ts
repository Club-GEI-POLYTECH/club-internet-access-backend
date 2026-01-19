import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { WiFiAccount, DurationType } from '../entities/wifi-account.entity';
import { MikroTikService } from '../mikrotik/mikrotik.service';
import { CreateWiFiAccountDto } from './dto/create-wifi-account.dto';
import * as crypto from 'crypto';

@Injectable()
export class WiFiAccountsService {
  private readonly logger = new Logger(WiFiAccountsService.name);

  constructor(
    @InjectRepository(WiFiAccount)
    private wifiAccountsRepository: Repository<WiFiAccount>,
    private mikrotikService: MikroTikService,
  ) {}

  private generateUsername(): string {
    const prefix = 'etu';
    const random = crypto.randomInt(1000, 9999);
    return `${prefix}${random}`;
  }

  private generatePassword(): string {
    return crypto.randomBytes(4).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
  }

  private calculateExpirationDate(duration: DurationType): Date {
    const now = new Date();
    switch (duration) {
      case DurationType.HOURS_24:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case DurationType.HOURS_48:
        return new Date(now.getTime() + 48 * 60 * 60 * 1000);
      case DurationType.DAYS_7:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case DurationType.DAYS_30:
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      case DurationType.UNLIMITED:
        return null;
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  private durationToMikrotikFormat(duration: DurationType): string {
    switch (duration) {
      case DurationType.HOURS_24:
        return '1d';
      case DurationType.HOURS_48:
        return '2d';
      case DurationType.DAYS_7:
        return '7d';
      case DurationType.DAYS_30:
        return '30d';
      case DurationType.UNLIMITED:
        return '0';
      default:
        return '1d';
    }
  }

  async create(createDto: CreateWiFiAccountDto, createdById?: string): Promise<WiFiAccount> {
    // Generate username and password if not provided
    const username = createDto.username || this.generateUsername();
    const password = this.generatePassword();
    const expiresAt = this.calculateExpirationDate(createDto.duration);

    // Create account in database
    const wifiAccount = this.wifiAccountsRepository.create({
      username,
      password,
      duration: createDto.duration,
      bandwidthProfile: createDto.bandwidthProfile,
      maxDevices: createDto.maxDevices || 1,
      expiresAt,
      isActive: true,
      isExpired: false,
      comment: createDto.comment,
      createdById,
    });

    const savedAccount = await this.wifiAccountsRepository.save(wifiAccount);

    // Create user in MikroTik
    try {
      const mikrotikUser = await this.mikrotikService.createHotspotUser({
        name: username,
        password: password,
        profile: createDto.bandwidthProfile,
        'limit-uptime': this.durationToMikrotikFormat(createDto.duration),
        'shared-users': createDto.maxDevices || 1,
        comment: createDto.comment || `Created via API - ${new Date().toISOString()}`,
      });

      // Update with MikroTik user ID
      savedAccount.mikrotikUserId = mikrotikUser['.id'] || mikrotikUser.id;
      await this.wifiAccountsRepository.save(savedAccount);

      this.logger.log(`✅ Created WiFi account: ${username}`);
    } catch (error) {
      this.logger.error(`❌ Failed to create MikroTik user: ${error.message}`);
      // Mark as inactive if MikroTik creation fails
      savedAccount.isActive = false;
      await this.wifiAccountsRepository.save(savedAccount);
      throw error;
    }

    return savedAccount;
  }

  async findAll(): Promise<WiFiAccount[]> {
    return await this.wifiAccountsRepository.find({
      relations: ['createdBy', 'payments', 'sessions'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<WiFiAccount> {
    return await this.wifiAccountsRepository.findOne({
      where: { id },
      relations: ['createdBy', 'payments', 'sessions'],
    });
  }

  async findByUsername(username: string): Promise<WiFiAccount> {
    return await this.wifiAccountsRepository.findOne({
      where: { username },
      relations: ['createdBy', 'payments', 'sessions'],
    });
  }

  async delete(id: string): Promise<void> {
    const account = await this.findOne(id);
    if (!account) {
      throw new Error('Account not found');
    }

    // Delete from MikroTik
    try {
      await this.mikrotikService.deleteHotspotUser(account.username);
    } catch (error) {
      this.logger.warn(`Failed to delete from MikroTik: ${error.message}`);
    }

    // Delete from database
    await this.wifiAccountsRepository.delete(id);
    this.logger.log(`✅ Deleted WiFi account: ${account.username}`);
  }

  async expireAccounts(): Promise<number> {
    const now = new Date();
    const expiredAccounts = await this.wifiAccountsRepository.find({
      where: {
        expiresAt: LessThan(now),
        isExpired: false,
        isActive: true,
      },
    });

    for (const account of expiredAccounts) {
      account.isExpired = true;
      account.isActive = false;
      await this.wifiAccountsRepository.save(account);

      // Disable in MikroTik
      try {
        await this.mikrotikService.disableUser(account.username);
      } catch (error) {
        this.logger.warn(`Failed to disable user in MikroTik: ${error.message}`);
      }
    }

    return expiredAccounts.length;
  }

  async getActiveAccounts(): Promise<WiFiAccount[]> {
    return await this.wifiAccountsRepository.find({
      where: {
        isActive: true,
        isExpired: false,
      },
      relations: ['sessions'],
    });
  }
}

