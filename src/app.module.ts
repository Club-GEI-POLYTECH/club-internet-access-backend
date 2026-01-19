import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { MikroTikModule } from './mikrotik/mikrotik.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PaymentModule } from './payment/payment.module';
import { WiFiAccountsModule } from './wifi-accounts/wifi-accounts.module';
import { SessionsModule } from './sessions/sessions.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { BandwidthModule } from './bandwidth/bandwidth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './entities/user.entity';
import { WiFiAccount } from './entities/wifi-account.entity';
import { Payment } from './entities/payment.entity';
import { Session } from './entities/session.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'postgres',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'unikin_user',
      password: process.env.DB_PASSWORD || 'unikin_password',
      database: process.env.DB_DATABASE || 'internet_access',
      entities: [User, WiFiAccount, Payment, Session, PasswordResetToken],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
      retryAttempts: 10,
      retryDelay: 3000,
      autoLoadEntities: true,
    }),
    MikroTikModule,
    UsersModule,
    AuthModule,
    PaymentModule,
    WiFiAccountsModule,
    SessionsModule,
    DashboardModule,
    BandwidthModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

