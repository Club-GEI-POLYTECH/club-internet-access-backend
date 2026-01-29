import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KafkaService } from './kafka.service';
import { Consumer } from 'kafkajs';
import { PaymentConsumer } from './consumers/payment.consumer';
import { WiFiAccountConsumer } from './consumers/wifi-account.consumer';
import { SessionConsumer } from './consumers/session.consumer';
import { UserConsumer } from './consumers/user.consumer';

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private consumers: Consumer[] = [];
  private isEnabled: boolean;

  constructor(
    private kafkaService: KafkaService,
    private configService: ConfigService,
    private paymentConsumer: PaymentConsumer,
    private wifiAccountConsumer: WiFiAccountConsumer,
    private sessionConsumer: SessionConsumer,
    private userConsumer: UserConsumer,
  ) {
    this.isEnabled = this.configService.get<boolean>('KAFKA_ENABLED', true);
  }

  async onModuleInit() {
    if (!this.isEnabled) {
      this.logger.warn('⚠️ Kafka consumers are disabled (KAFKA_ENABLED=false)');
      return;
    }

    if (!this.kafkaService.isProducerConnected()) {
      this.logger.warn('⚠️ Kafka Producer not connected, consumers will not start');
      return;
    }

    try {
      // Consumer pour les paiements
      const paymentConsumer = this.kafkaService.createConsumer('payment-consumer-group');
      await paymentConsumer.connect();
      await paymentConsumer.subscribe({ topic: 'payments', fromBeginning: false });
      await paymentConsumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const value = message.value?.toString();
            if (value) {
              await this.paymentConsumer.handleMessage(JSON.parse(value));
            }
          } catch (error) {
            this.logger.error(`❌ Error processing payment message: ${error.message}`);
          }
        },
      });
      this.consumers.push(paymentConsumer);
      this.logger.log('✅ Payment consumer started');

      // Consumer pour les comptes Wi-Fi
      const wifiAccountConsumer = this.kafkaService.createConsumer('wifi-account-consumer-group');
      await wifiAccountConsumer.connect();
      await wifiAccountConsumer.subscribe({ topic: 'wifi-accounts', fromBeginning: false });
      await wifiAccountConsumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const value = message.value?.toString();
            if (value) {
              await this.wifiAccountConsumer.handleMessage(JSON.parse(value));
            }
          } catch (error) {
            this.logger.error(`❌ Error processing wifi-account message: ${error.message}`);
          }
        },
      });
      this.consumers.push(wifiAccountConsumer);
      this.logger.log('✅ WiFi Account consumer started');

      // Consumer pour les sessions
      const sessionConsumer = this.kafkaService.createConsumer('session-consumer-group');
      await sessionConsumer.connect();
      await sessionConsumer.subscribe({ topic: 'sessions', fromBeginning: false });
      await sessionConsumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const value = message.value?.toString();
            if (value) {
              await this.sessionConsumer.handleMessage(JSON.parse(value));
            }
          } catch (error) {
            this.logger.error(`❌ Error processing session message: ${error.message}`);
          }
        },
      });
      this.consumers.push(sessionConsumer);
      this.logger.log('✅ Session consumer started');

      // Consumer pour les utilisateurs
      const userConsumer = this.kafkaService.createConsumer('user-consumer-group');
      await userConsumer.connect();
      await userConsumer.subscribe({ topic: 'users', fromBeginning: false });
      await userConsumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const value = message.value?.toString();
            if (value) {
              await this.userConsumer.handleMessage(JSON.parse(value));
            }
          } catch (error) {
            this.logger.error(`❌ Error processing user message: ${error.message}`);
          }
        },
      });
      this.consumers.push(userConsumer);
      this.logger.log('✅ User consumer started');

      this.logger.log(`✅ All Kafka consumers started (${this.consumers.length} consumers)`);
    } catch (error) {
      this.logger.error(`❌ Failed to start Kafka consumers: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    for (const consumer of this.consumers) {
      try {
        await consumer.disconnect();
        this.logger.log('✅ Consumer disconnected');
      } catch (error) {
        this.logger.error(`❌ Error disconnecting consumer: ${error.message}`);
      }
    }
  }
}
