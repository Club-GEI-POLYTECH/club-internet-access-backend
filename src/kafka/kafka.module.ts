import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaService } from './kafka.service';
import { KafkaConsumerService } from './kafka-consumer.service';
import { PaymentModule } from '../payment/payment.module';
import { WiFiAccountsModule } from '../wifi-accounts/wifi-accounts.module';
import { SessionsModule } from '../sessions/sessions.module';
import { UsersModule } from '../users/users.module';
import { PaymentConsumer } from './consumers/payment.consumer';
import { WiFiAccountConsumer } from './consumers/wifi-account.consumer';
import { SessionConsumer } from './consumers/session.consumer';
import { UserConsumer } from './consumers/user.consumer';

@Global()
@Module({
  imports: [
    ConfigModule,
    PaymentModule,
    WiFiAccountsModule,
    SessionsModule,
    UsersModule,
  ],
  providers: [
    KafkaService,
    KafkaConsumerService,
    PaymentConsumer,
    WiFiAccountConsumer,
    SessionConsumer,
    UserConsumer,
  ],
  exports: [KafkaService, KafkaConsumerService],
})
export class KafkaModule {}
