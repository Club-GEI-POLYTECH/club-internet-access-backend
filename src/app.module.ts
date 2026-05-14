import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PaymentModule } from './payment/payment.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { TicketsModule } from './tickets/tickets.module';
import { databaseConfig } from './config/database.config';
import { KelpayModule } from './kelpay/kelpay.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: databaseConfig,
      inject: [ConfigService],
    }),
    CommonModule,
    UsersModule,
    AuthModule,
    PaymentModule,
    DashboardModule,
    TicketsModule,
    KelpayModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
