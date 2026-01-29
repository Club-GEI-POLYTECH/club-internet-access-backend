import { Injectable, Logger } from '@nestjs/common';
import { WiFiAccountsService } from '../../wifi-accounts/wifi-accounts.service';
import { WiFiAccountMessage } from '../interfaces/kafka-message.interface';
import { DurationType, BandwidthProfile } from '../../entities/wifi-account.entity';

@Injectable()
export class WiFiAccountConsumer {
  private readonly logger = new Logger(WiFiAccountConsumer.name);

  constructor(private wifiAccountsService: WiFiAccountsService) {}

  async handleMessage(message: WiFiAccountMessage): Promise<void> {
    this.logger.log(`📥 Received wifi-account event: ${message.event}`);

    try {
      switch (message.event) {
        case 'wifi-account.created':
          await this.handleWiFiAccountCreated(message);
          break;
        case 'wifi-account.activated':
          await this.handleWiFiAccountActivated(message);
          break;
        case 'wifi-account.expired':
          await this.handleWiFiAccountExpired(message);
          break;
        case 'wifi-account.deleted':
          await this.handleWiFiAccountDeleted(message);
          break;
        default:
          this.logger.warn(`⚠️ Unknown wifi-account event: ${message.event}`);
      }
    } catch (error) {
      this.logger.error(`❌ Error handling wifi-account message: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleWiFiAccountCreated(message: WiFiAccountMessage): Promise<void> {
    const { data } = message;

    // Si le compte existe déjà (par ID ou username), on skip
    if (data.id) {
      try {
        const existingAccount = await this.wifiAccountsService.findOne(data.id);
        if (existingAccount) {
          this.logger.log(`ℹ️ WiFi Account ${data.id} already exists, skipping creation`);
          return;
        }
      } catch (error) {
        // Le compte n'existe pas, on continue
      }
    }

    if (data.username) {
      try {
        const existingAccount = await this.wifiAccountsService.findByUsername(data.username);
        if (existingAccount) {
          this.logger.log(`ℹ️ WiFi Account with username ${data.username} already exists, skipping creation`);
          return;
        }
      } catch (error) {
        // Le compte n'existe pas, on continue
      }
    }

    // Créer un nouveau compte Wi-Fi
    const account = await this.wifiAccountsService.create(
      {
        username: data.username,
        duration: (data.duration as DurationType) || DurationType.HOURS_24,
        bandwidthProfile: (data.bandwidthProfile as BandwidthProfile) || BandwidthProfile.STANDARD_2MB,
        maxDevices: data.maxDevices || 1,
        comment: data.comment,
      },
      data.userId,
    );

    this.logger.log(`✅ WiFi Account created from Kafka: ${account.username}`);
  }

  private async handleWiFiAccountActivated(message: WiFiAccountMessage): Promise<void> {
    const { data } = message;

    if (!data.id && !data.username) {
      this.logger.warn('⚠️ WiFi Account ID or username required for activation');
      return;
    }

    // Note: L'activation nécessiterait une méthode dans le service
    // Pour l'instant, on log juste l'événement
    this.logger.log(`ℹ️ WiFi Account activation requested: ${data.id || data.username}`);
  }

  private async handleWiFiAccountExpired(message: WiFiAccountMessage): Promise<void> {
    const { data } = message;

    if (!data.id && !data.username) {
      this.logger.warn('⚠️ WiFi Account ID or username required for expiration');
      return;
    }

    // Note: L'expiration est gérée par le scheduler, mais on peut log l'événement
    this.logger.log(`ℹ️ WiFi Account expiration event: ${data.id || data.username}`);
  }

  private async handleWiFiAccountDeleted(message: WiFiAccountMessage): Promise<void> {
    const { data } = message;

    if (!data.id && !data.username) {
      this.logger.warn('⚠️ WiFi Account ID or username required for deletion');
      return;
    }

    try {
      if (data.id) {
        await this.wifiAccountsService.delete(data.id);
        this.logger.log(`✅ WiFi Account deleted from Kafka: ${data.id}`);
      } else if (data.username) {
        const account = await this.wifiAccountsService.findByUsername(data.username);
        if (account) {
          await this.wifiAccountsService.delete(account.id);
          this.logger.log(`✅ WiFi Account deleted from Kafka: ${data.username}`);
        }
      }
    } catch (error) {
      this.logger.error(`❌ Failed to delete WiFi Account: ${error.message}`);
    }
  }
}
