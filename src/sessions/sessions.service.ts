import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../entities/session.entity';
import { WiFiAccount } from '../entities/wifi-account.entity';
import { MikroTikService, ActiveUser } from '../mikrotik/mikrotik.service';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>,
    @InjectRepository(WiFiAccount)
    private wifiAccountsRepository: Repository<WiFiAccount>,
    private mikrotikService: MikroTikService,
  ) {}

  async syncActiveSessions(): Promise<number> {
    try {
      const activeUsers = await this.mikrotikService.getActiveUsers();
      let syncedCount = 0;

      for (const mikrotikUser of activeUsers) {
        // Find or create session
        let session = await this.sessionsRepository.findOne({
          where: {
            mikrotikSessionId: mikrotikUser.id,
            isActive: true,
          },
        });

        if (!session) {
          // Try to find WiFi account by username
          const wifiAccount = await this.findWiFiAccountByUsername(mikrotikUser.user);
          if (wifiAccount) {
            session = this.sessionsRepository.create({
              wifiAccountId: wifiAccount.id,
              mikrotikSessionId: mikrotikUser.id,
              ipAddress: mikrotikUser.address,
              bytesIn: mikrotikUser['bytes-in'],
              bytesOut: mikrotikUser['bytes-out'],
              connectedAt: new Date(),
              isActive: true,
            });
            await this.sessionsRepository.save(session);
            syncedCount++;
          }
        } else {
          // Update existing session
          session.bytesIn = mikrotikUser['bytes-in'];
          session.bytesOut = mikrotikUser['bytes-out'];
          await this.sessionsRepository.save(session);
        }
      }

      // Mark sessions as inactive if they're not in MikroTik active list
      const activeSessionIds = activeUsers.map((u) => u.id);
      await this.sessionsRepository
        .createQueryBuilder()
        .update(Session)
        .set({ isActive: false, disconnectedAt: new Date() })
        .where('isActive = :isActive', { isActive: true })
        .andWhere('mikrotikSessionId NOT IN (:...ids)', { ids: activeSessionIds.length > 0 ? activeSessionIds : [''] })
        .execute();

      return syncedCount;
    } catch (error) {
      this.logger.error(`❌ Failed to sync sessions: ${error.message}`);
      throw error;
    }
  }

  private async findWiFiAccountByUsername(username: string): Promise<WiFiAccount | null> {
    return await this.wifiAccountsRepository.findOne({
      where: { username },
    });
  }

  async findAll(): Promise<Session[]> {
    return await this.sessionsRepository.find({
      relations: ['wifiAccount'],
      order: { createdAt: 'DESC' },
    });
  }

  async findActive(): Promise<Session[]> {
    return await this.sessionsRepository.find({
      where: { isActive: true },
      relations: ['wifiAccount'],
      order: { connectedAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Session> {
    return await this.sessionsRepository.findOne({
      where: { id },
      relations: ['wifiAccount'],
    });
  }

  async findByWiFiAccount(wifiAccountId: string): Promise<Session[]> {
    return await this.sessionsRepository.find({
      where: { wifiAccountId },
      relations: ['wifiAccount'],
      order: { createdAt: 'DESC' },
    });
  }

  async getStatistics() {
    const totalSessions = await this.sessionsRepository.count();
    const activeSessions = await this.sessionsRepository.count({
      where: { isActive: true },
    });

    const totalBytes = await this.sessionsRepository
      .createQueryBuilder('session')
      .select('SUM(session.bytesIn + session.bytesOut)', 'total')
      .getRawOne();

    return {
      totalSessions,
      activeSessions,
      totalBytesTransferred: parseInt(totalBytes?.total || '0'),
    };
  }
}

