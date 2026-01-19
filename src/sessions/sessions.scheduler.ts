import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SessionsService } from './sessions.service';

@Injectable()
export class SessionsScheduler {
  private readonly logger = new Logger(SessionsScheduler.name);

  constructor(private sessionsService: SessionsService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncSessions() {
    this.logger.log('Running scheduled task: Syncing active sessions...');
    try {
      const syncedCount = await this.sessionsService.syncActiveSessions();
      if (syncedCount > 0) {
        this.logger.log(`✅ Synced ${syncedCount} active session(s)`);
      }
    } catch (error) {
      this.logger.error(`❌ Error syncing sessions: ${error.message}`);
    }
  }
}

