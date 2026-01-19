import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WiFiAccountsService } from './wifi-accounts.service';

@Injectable()
export class WiFiAccountsScheduler {
  private readonly logger = new Logger(WiFiAccountsScheduler.name);

  constructor(private wifiAccountsService: WiFiAccountsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredAccounts() {
    this.logger.log('Running scheduled task: Expiring WiFi accounts...');
    try {
      const expiredCount = await this.wifiAccountsService.expireAccounts();
      if (expiredCount > 0) {
        this.logger.log(`✅ Expired ${expiredCount} WiFi account(s)`);
      }
    } catch (error) {
      this.logger.error(`❌ Error expiring accounts: ${error.message}`);
    }
  }
}

