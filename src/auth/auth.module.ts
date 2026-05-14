import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { PendingRegistration } from '../entities/pending-registration.entity';

@Module({
  imports: [
    UsersModule,
    NotificationsModule,
    PassportModule,
    TypeOrmModule.forFeature([PasswordResetToken, PendingRegistration]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const secret = (configService.get<string>('JWT_SECRET') ?? '').trim();
        if (!secret) {
          throw new Error('JWT_SECRET doit être défini dans le fichier .env (voir .env.local.example).');
        }
        return {
          secret,
          signOptions: { expiresIn: '7d' },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy, LocalStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
