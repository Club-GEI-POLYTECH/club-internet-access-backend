import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { WiFiAccount } from '../entities/wifi-account.entity';
import { Payment } from '../entities/payment.entity';
import { Session } from '../entities/session.entity';
import { User } from '../entities/user.entity';
import { MikroTikModule } from '../mikrotik/mikrotik.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WiFiAccount, Payment, Session, User]),
    MikroTikModule,
  ],
  providers: [DashboardService],
  controllers: [DashboardController],
  exports: [DashboardService],
})
export class DashboardModule {}

