import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Consumer, KafkaConfig } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;
  private isConnected = false;

  constructor(private configService: ConfigService) {
    const brokers = this.configService
      .get<string>('KAFKA_BROKERS', 'localhost:9092')
      .split(',')
      .map((b) => b.trim());

    const kafkaConfig: KafkaConfig = {
      clientId: this.configService.get<string>('KAFKA_CLIENT_ID', 'internet-access-backend'),
      brokers,
      retry: {
        retries: 8,
        initialRetryTime: 100,
        multiplier: 2,
        maxRetryTime: 30000,
      },
      requestTimeout: 30000,
      connectionTimeout: 3000,
    };

    // Ajouter l'authentification si fournie
    const username = this.configService.get<string>('KAFKA_USERNAME');
    const password = this.configService.get<string>('KAFKA_PASSWORD');
    if (username && password) {
      kafkaConfig.sasl = {
        mechanism: 'plain',
        username,
        password,
      };
    }

    this.kafka = new Kafka(kafkaConfig);
    this.producer = this.kafka.producer({
      allowAutoTopicCreation: this.configService.get<boolean>('KAFKA_AUTO_TOPIC_CREATION', false),
      transactionTimeout: 30000,
    });
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      this.isConnected = true;
      this.logger.log('✅ Kafka Producer connected');
    } catch (error) {
      this.logger.error(`❌ Failed to connect Kafka Producer: ${error.message}`);
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      await this.producer.disconnect();
      this.logger.log('✅ Kafka Producer disconnected');
    }
  }

  getProducer(): Producer {
    if (!this.isConnected) {
      throw new Error('Kafka Producer is not connected');
    }
    return this.producer;
  }

  createConsumer(groupId: string): Consumer {
    return this.kafka.consumer({
      groupId,
      allowAutoTopicCreation: this.configService.get<boolean>('KAFKA_AUTO_TOPIC_CREATION', false),
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });
  }

  async sendMessage(topic: string, messages: Array<{ key?: string; value: string }>): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('⚠️ Kafka Producer not connected, skipping message');
      return;
    }

    try {
      await this.producer.send({
        topic,
        messages,
      });
      this.logger.debug(`📤 Message sent to topic: ${topic}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send message to topic ${topic}: ${error.message}`);
      throw error;
    }
  }

  isProducerConnected(): boolean {
    return this.isConnected;
  }
}
