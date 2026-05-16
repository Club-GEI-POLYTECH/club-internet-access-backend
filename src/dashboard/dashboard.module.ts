import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Payment } from '../entities/payment.entity';
import { User } from '../entities/user.entity';
import { Ticket } from '../entities/ticket.entity';
import { TicketType } from '../entities/ticket-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, User, Ticket, TicketType])],
  providers: [DashboardService],
  controllers: [DashboardController],
  exports: [DashboardService],
})
export class DashboardModule {}
