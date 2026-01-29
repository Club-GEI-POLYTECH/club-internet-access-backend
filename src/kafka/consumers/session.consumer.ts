import { Injectable, Logger } from '@nestjs/common';
import { SessionsService } from '../../sessions/sessions.service';
import { SessionMessage } from '../interfaces/kafka-message.interface';

@Injectable()
export class SessionConsumer {
  private readonly logger = new Logger(SessionConsumer.name);

  constructor(private sessionsService: SessionsService) {}

  async handleMessage(message: SessionMessage): Promise<void> {
    this.logger.log(`📥 Received session event: ${message.event}`);

    try {
      switch (message.event) {
        case 'session.started':
          await this.handleSessionStarted(message);
          break;
        case 'session.ended':
          await this.handleSessionEnded(message);
          break;
        case 'session.updated':
          await this.handleSessionUpdated(message);
          break;
        default:
          this.logger.warn(`⚠️ Unknown session event: ${message.event}`);
      }
    } catch (error) {
      this.logger.error(`❌ Error handling session message: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async handleSessionStarted(message: SessionMessage): Promise<void> {
    const { data } = message;

    // Note: La création de session est généralement gérée par la synchronisation MikroTik
    // Mais on peut log l'événement pour le suivi
    this.logger.log(
      `ℹ️ Session started event: ${data.username || data.wifiAccountId} - IP: ${data.ipAddress}`,
    );
  }

  private async handleSessionEnded(message: SessionMessage): Promise<void> {
    const { data } = message;

    // Note: La fin de session est généralement gérée par la synchronisation MikroTik
    this.logger.log(
      `ℹ️ Session ended event: ${data.username || data.wifiAccountId} - Session ID: ${data.mikrotikSessionId}`,
    );
  }

  private async handleSessionUpdated(message: SessionMessage): Promise<void> {
    const { data } = message;

    // Note: La mise à jour de session est généralement gérée par la synchronisation MikroTik
    this.logger.log(
      `ℹ️ Session updated event: ${data.username || data.wifiAccountId} - Bytes: ${data.bytesIn}/${data.bytesOut}`,
    );
  }
}
