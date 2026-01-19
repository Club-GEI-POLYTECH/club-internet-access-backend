import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MikroTikService } from './mikrotik.service';
import { MikroTikController } from './mikrotik.controller';

@Module({
  imports: [ConfigModule],
  providers: [MikroTikService],
  controllers: [MikroTikController],
  exports: [MikroTikService],
})
export class MikroTikModule {}

