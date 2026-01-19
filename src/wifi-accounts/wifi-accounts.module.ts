import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WiFiAccountsService } from './wifi-accounts.service';
import { WiFiAccountsController } from './wifi-accounts.controller';
import { WiFiAccountsScheduler } from './wifi-accounts.scheduler';
import { WiFiAccount } from '../entities/wifi-account.entity';
import { MikroTikModule } from '../mikrotik/mikrotik.module';

@Module({
  imports: [TypeOrmModule.forFeature([WiFiAccount]), MikroTikModule],
  providers: [WiFiAccountsService, WiFiAccountsScheduler],
  controllers: [WiFiAccountsController],
  exports: [WiFiAccountsService],
})
export class WiFiAccountsModule {}

