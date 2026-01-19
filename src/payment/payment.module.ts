import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { Payment } from '../entities/payment.entity';
import { WiFiAccountsModule } from '../wifi-accounts/wifi-accounts.module';

@Module({
  imports: [TypeOrmModule.forFeature([Payment]), WiFiAccountsModule],
  providers: [PaymentService],
  controllers: [PaymentController],
  exports: [PaymentService],
})
export class PaymentModule {}

