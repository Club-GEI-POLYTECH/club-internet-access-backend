import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../entities/session.entity';
import { WiFiAccount } from '../entities/wifi-account.entity';
import { MikroTikService, ActiveUser } from '../mikrotik/mikrotik.service';

export interface BandwidthUsage {
  username: string;
  wifiAccountId?: string;
  ipAddress: string;
  bytesIn: number;
  bytesOut: number;
  totalBytes: number;
  bytesInFormatted: string;
  bytesOutFormatted: string;
  totalBytesFormatted: string;
  uptime: string;
  downloadSpeed?: number; // bytes per second
  uploadSpeed?: number; // bytes per second
}

export interface BandwidthStats {
  totalBytesIn: number;
  totalBytesOut: number;
  totalBytes: number;
  activeUsers: number;
  averageBytesPerUser: number;
  topUsers: BandwidthUsage[];
}

@Injectable()
export class BandwidthService {
  private readonly logger = new Logger(BandwidthService.name);
  private previousData: Map<string, { bytesIn: number; bytesOut: number; timestamp: number }> = new Map();

  constructor(
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>,
    @InjectRepository(WiFiAccount)
    private wifiAccountsRepository: Repository<WiFiAccount>,
    private mikrotikService: MikroTikService,
  ) {}

  /**
   * Formater les bytes en format lisible (KB, MB, GB)
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Calculer la vitesse de transfert (bytes/second)
   */
  private calculateSpeed(
    currentBytes: number,
    previousBytes: number,
    timeDiff: number,
  ): number {
    if (timeDiff === 0) return 0;
    return (currentBytes - previousBytes) / timeDiff;
  }

  /**
   * Obtenir l'utilisation de bande passante en temps réel depuis MikroTik
   */
  async getRealTimeUsage(): Promise<BandwidthUsage[]> {
    try {
      const activeUsers = await this.mikrotikService.getActiveUsers();
      const now = Date.now();
      const usage: BandwidthUsage[] = [];

      for (const user of activeUsers) {
        const key = user.id;
        const previous = this.previousData.get(key);
        const currentBytesIn = user['bytes-in'];
        const currentBytesOut = user['bytes-out'];

        let downloadSpeed = 0;
        let uploadSpeed = 0;

        if (previous) {
          const timeDiff = (now - previous.timestamp) / 1000; // en secondes
          downloadSpeed = this.calculateSpeed(currentBytesIn, previous.bytesIn, timeDiff);
          uploadSpeed = this.calculateSpeed(currentBytesOut, previous.bytesOut, timeDiff);
        }

        // Mettre à jour les données précédentes
        this.previousData.set(key, {
          bytesIn: currentBytesIn,
          bytesOut: currentBytesOut,
          timestamp: now,
        });

        const totalBytes = currentBytesIn + currentBytesOut;

        usage.push({
          username: user.user,
          ipAddress: user.address,
          bytesIn: currentBytesIn,
          bytesOut: currentBytesOut,
          totalBytes,
          bytesInFormatted: this.formatBytes(currentBytesIn),
          bytesOutFormatted: this.formatBytes(currentBytesOut),
          totalBytesFormatted: this.formatBytes(totalBytes),
          uptime: user.uptime,
          downloadSpeed: Math.max(0, downloadSpeed),
          uploadSpeed: Math.max(0, uploadSpeed),
        });
      }

      // Nettoyer les données des utilisateurs déconnectés
      const activeKeys = new Set(activeUsers.map((u) => u.id));
      for (const key of this.previousData.keys()) {
        if (!activeKeys.has(key)) {
          this.previousData.delete(key);
        }
      }

      // Trier par utilisation totale (décroissant)
      return usage.sort((a, b) => b.totalBytes - a.totalBytes);
    } catch (error: any) {
      this.logger.error(`❌ Failed to get real-time usage: ${error.message}`);
      throw new Error(`Failed to get real-time bandwidth usage: ${error.message}`);
    }
  }

  /**
   * Obtenir les statistiques globales de bande passante
   */
  async getBandwidthStats(): Promise<BandwidthStats> {
    try {
      const activeUsers = await this.mikrotikService.getActiveUsers();
      
      let totalBytesIn = 0;
      let totalBytesOut = 0;

      const usage: BandwidthUsage[] = [];

      for (const user of activeUsers) {
        const bytesIn = user['bytes-in'];
        const bytesOut = user['bytes-out'];
        const totalBytes = bytesIn + bytesOut;

        totalBytesIn += bytesIn;
        totalBytesOut += bytesOut;

        // Trouver le compte Wi-Fi associé
        const wifiAccount = await this.wifiAccountsRepository.findOne({
          where: { username: user.user },
        });

        usage.push({
          username: user.user,
          wifiAccountId: wifiAccount?.id,
          ipAddress: user.address,
          bytesIn,
          bytesOut,
          totalBytes,
          bytesInFormatted: this.formatBytes(bytesIn),
          bytesOutFormatted: this.formatBytes(bytesOut),
          totalBytesFormatted: this.formatBytes(totalBytes),
          uptime: user.uptime,
        });
      }

      // Trier et prendre les 10 premiers
      const topUsers = usage.sort((a, b) => b.totalBytes - a.totalBytes).slice(0, 10);

      const totalBytes = totalBytesIn + totalBytesOut;
      const activeUsersCount = activeUsers.length;

      return {
        totalBytesIn,
        totalBytesOut,
        totalBytes,
        activeUsers: activeUsersCount,
        averageBytesPerUser: activeUsersCount > 0 ? totalBytes / activeUsersCount : 0,
        topUsers,
      };
    } catch (error: any) {
      this.logger.error(`❌ Failed to get bandwidth stats: ${error.message}`);
      throw new Error(`Failed to get bandwidth statistics: ${error.message}`);
    }
  }

  /**
   * Obtenir l'utilisation de bande passante pour un utilisateur spécifique
   */
  async getUserBandwidth(username: string): Promise<BandwidthUsage | null> {
    try {
      const activeUsers = await this.mikrotikService.getActiveUsers();
      const user = activeUsers.find((u) => u.user === username);

      if (!user) {
        return null;
      }

      const totalBytes = user['bytes-in'] + user['bytes-out'];

      return {
        username: user.user,
        ipAddress: user.address,
        bytesIn: user['bytes-in'],
        bytesOut: user['bytes-out'],
        totalBytes,
        bytesInFormatted: this.formatBytes(user['bytes-in']),
        bytesOutFormatted: this.formatBytes(user['bytes-out']),
        totalBytesFormatted: this.formatBytes(totalBytes),
        uptime: user.uptime,
      };
    } catch (error: any) {
      this.logger.error(`❌ Failed to get user bandwidth: ${error.message}`);
      throw new Error(`Failed to get user bandwidth: ${error.message}`);
    }
  }

  /**
   * Obtenir l'historique de bande passante depuis la base de données
   */
  async getHistoricalUsage(days: number = 7): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sessions = await this.sessionsRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.wifiAccount', 'wifiAccount')
      .where('session.createdAt >= :startDate', { startDate })
      .orderBy('session.createdAt', 'DESC')
      .getMany();

    return sessions.map((session) => ({
      id: session.id,
      username: session.wifiAccount?.username || 'Unknown',
      bytesIn: session.bytesIn,
      bytesOut: session.bytesOut,
      totalBytes: session.bytesIn + session.bytesOut,
      bytesInFormatted: this.formatBytes(session.bytesIn),
      bytesOutFormatted: this.formatBytes(session.bytesOut),
      totalBytesFormatted: this.formatBytes(session.bytesIn + session.bytesOut),
      connectedAt: session.connectedAt,
      disconnectedAt: session.disconnectedAt,
      isActive: session.isActive,
    }));
  }
}

