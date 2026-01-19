import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { SessionsScheduler } from './sessions.scheduler';
import { Session } from '../entities/session.entity';
import { WiFiAccount } from '../entities/wifi-account.entity';
import { MikroTikModule } from '../mikrotik/mikrotik.module';

@Module({
  imports: [TypeOrmModule.forFeature([Session, WiFiAccount]), MikroTikModule],
  providers: [SessionsService, SessionsScheduler],
  controllers: [SessionsController],
  exports: [SessionsService],
})
export class SessionsModule {}

