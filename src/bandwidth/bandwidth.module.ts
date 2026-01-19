import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BandwidthService } from './bandwidth.service';
import { BandwidthController } from './bandwidth.controller';
import { Session } from '../entities/session.entity';
import { WiFiAccount } from '../entities/wifi-account.entity';
import { MikroTikModule } from '../mikrotik/mikrotik.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, WiFiAccount]),
    MikroTikModule,
  ],
  controllers: [BandwidthController],
  providers: [BandwidthService],
  exports: [BandwidthService],
})
export class BandwidthModule {}

