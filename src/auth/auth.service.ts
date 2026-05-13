import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RegisterRequestDto } from './dto/register-request.dto';
import { RegisterVerifyDto } from './dto/register-verify.dto';
import { RegisterResendDto } from './dto/register-resend.dto';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { PendingRegistration } from '../entities/pending-registration.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
    @InjectRepository(PasswordResetToken)
    private passwordResetTokenRepository: Repository<PasswordResetToken>,
    @InjectRepository(PendingRegistration)
    private pendingRegistrationRepository: Repository<PendingRegistration>,
  ) {}

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private generateSixDigitCode(): string {
    return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  private registrationTtlMs(): number {
    const mins = parseInt(
      this.configService.get<string>('REGISTRATION_CODE_EXPIRES_MINUTES') ?? '15',
      10,
    );
    return Math.max(1, mins) * 60_000;
  }

  private maxVerifyAttempts(): number {
    const n = parseInt(
      this.configService.get<string>('REGISTRATION_MAX_VERIFY_ATTEMPTS') ?? '5',
      10,
    );
    return Math.max(1, n);
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(this.normalizeEmail(email));
    if (!user) {
      return null;
    }

    const isPasswordValid = await this.usersService.verifyPassword(user, password);
    if (!isPasswordValid) {
      return null;
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is not active');
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(user: any) {
    this.logger.log(`login success email=${user.email} role=${user.role}`);
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async requestRegistration(
    dto: RegisterRequestDto,
  ): Promise<{ message: string }> {
    const email = this.normalizeEmail(dto.email);
    this.logger.log(`requestRegistration email=${email}`);

    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('Cet email est déjà enregistré');
    }

    await this.pendingRegistrationRepository.delete({ email });

    const code = this.generateSixDigitCode();
    const logCode =
      this.configService.get<string>('NODE_ENV') === 'development' &&
      this.configService.get<string>('REGISTRATION_LOG_CODE_IN_DEV') === 'true';
    if (logCode) {
      this.logger.warn(`[dev] code inscription pour ${email} : ${code}`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const codeHash = await bcrypt.hash(code, 8);
    const expiresAt = new Date(Date.now() + this.registrationTtlMs());

    const pending = this.pendingRegistrationRepository.create({
      email,
      passwordHash,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      phone: dto.phone?.trim() || null,
      codeHash,
      expiresAt,
      verifyAttempts: 0,
    });
    await this.pendingRegistrationRepository.save(pending);

    try {
      await this.notificationsService.sendRegistrationVerificationEmail(
        email,
        pending.firstName,
        code,
      );
    } catch (err: any) {
      await this.pendingRegistrationRepository.delete({ id: pending.id });
      this.logger.error(`Échec envoi code inscription ${email}`, err?.stack);
      throw new BadRequestException(
        'Impossible d’envoyer l’email de vérification. Vérifiez la configuration SMTP ou réessayez plus tard.',
      );
    }

    return {
      message:
        'Si cette adresse est valide et disponible, un code à 6 chiffres vient d’être envoyé par email.',
    };
  }

  async verifyRegistration(dto: RegisterVerifyDto) {
    const email = this.normalizeEmail(dto.email);
    this.logger.log(`verifyRegistration email=${email}`);

    const pending = await this.pendingRegistrationRepository.findOne({
      where: { email },
    });

    if (!pending) {
      throw new BadRequestException('Code invalide ou inscription expirée');
    }

    if (new Date() > pending.expiresAt) {
      await this.pendingRegistrationRepository.delete({ id: pending.id });
      throw new BadRequestException('Code expiré. Relancez une demande d’inscription.');
    }

    if (pending.verifyAttempts >= this.maxVerifyAttempts()) {
      await this.pendingRegistrationRepository.delete({ id: pending.id });
      throw new BadRequestException('Trop de tentatives. Relancez une demande d’inscription.');
    }

    const codeOk = await bcrypt.compare(dto.code, pending.codeHash);
    if (!codeOk) {
      pending.verifyAttempts += 1;
      await this.pendingRegistrationRepository.save(pending);
      throw new BadRequestException('Code incorrect');
    }

    let user;
    try {
      user = await this.usersService.createStudentWithPasswordHash({
        email: pending.email,
        passwordHash: pending.passwordHash,
        firstName: pending.firstName,
        lastName: pending.lastName,
        phone: pending.phone,
      });
    } catch (e) {
      if (e instanceof QueryFailedError && (e as any).driverError?.code === '23505') {
        await this.pendingRegistrationRepository.delete({ id: pending.id });
        throw new ConflictException('Cet email est déjà enregistré');
      }
      throw e;
    }

    await this.pendingRegistrationRepository.delete({ id: pending.id });
    this.logger.log(`verifyRegistration success userId=${user.id}`);

    const { password: _, ...safe } = user;
    return this.login(safe);
  }

  async resendRegistrationCode(dto: RegisterResendDto): Promise<{ message: string }> {
    const email = this.normalizeEmail(dto.email);
    this.logger.log(`resendRegistrationCode email=${email}`);

    const pending = await this.pendingRegistrationRepository.findOne({
      where: { email },
    });

    if (!pending) {
      throw new BadRequestException('Aucune inscription en cours pour cet email');
    }

    if (new Date() > pending.expiresAt) {
      await this.pendingRegistrationRepository.delete({ id: pending.id });
      throw new BadRequestException('La demande a expiré. Reprenez l’inscription depuis le début.');
    }

    const code = this.generateSixDigitCode();
    const logCode =
      this.configService.get<string>('NODE_ENV') === 'development' &&
      this.configService.get<string>('REGISTRATION_LOG_CODE_IN_DEV') === 'true';
    if (logCode) {
      this.logger.warn(`[dev] code inscription (renvoi) pour ${email} : ${code}`);
    }

    pending.codeHash = await bcrypt.hash(code, 8);
    pending.expiresAt = new Date(Date.now() + this.registrationTtlMs());
    pending.verifyAttempts = 0;
    await this.pendingRegistrationRepository.save(pending);

    try {
      await this.notificationsService.sendRegistrationVerificationEmail(
        email,
        pending.firstName,
        code,
      );
    } catch (err: any) {
      this.logger.error(`Échec renvoi code inscription ${email}`, err?.stack);
      throw new BadRequestException(
        'Impossible d’envoyer l’email. Vérifiez la configuration SMTP ou réessayez plus tard.',
      );
    }

    return { message: 'Un nouveau code a été envoyé par email.' };
  }

  async requestPasswordReset(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    this.logger.log(`Demande de réinitialisation de mot de passe pour: ${forgotPasswordDto.email}`);

    const user = await this.usersService.findByEmail(forgotPasswordDto.email);

    // Pour des raisons de sécurité, on ne révèle pas si l'email existe ou non
    if (!user) {
      this.logger.warn(`Tentative de réinitialisation avec un email inexistant: ${forgotPasswordDto.email}`);
      return {
        message: 'Si cet email existe, un lien de réinitialisation a été envoyé',
      };
    }

    // Invalider tous les tokens précédents pour cet utilisateur
    await this.passwordResetTokenRepository.update(
      { userId: user.id, used: false },
      { used: true },
    );

    // Générer un token sécurisé
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token valide 1 heure

    // Créer le token en base de données
    const resetToken = this.passwordResetTokenRepository.create({
      userId: user.id,
      token,
      expiresAt,
      used: false,
    });

    await this.passwordResetTokenRepository.save(resetToken);
    this.logger.log(`Token de réinitialisation créé pour: ${forgotPasswordDto.email}`);

    // Construire l'URL de réinitialisation
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    // Envoyer l'email de réinitialisation
    try {
      await this.notificationsService.sendPasswordResetEmail(
        user.email,
        user.firstName || user.email,
        resetUrl,
      );
      this.logger.log(`Email de réinitialisation envoyé à: ${forgotPasswordDto.email}`);
    } catch (error: any) {
      this.logger.error(`Erreur lors de l'envoi de l'email de réinitialisation`, error.stack);
      // On ne révèle pas l'erreur à l'utilisateur
    }

    return {
      message: 'Si cet email existe, un lien de réinitialisation a été envoyé',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    this.logger.log(`Tentative de réinitialisation de mot de passe avec token`);

    // Trouver le token
    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: { token: resetPasswordDto.token },
      relations: ['user'],
    });

    if (!resetToken) {
      this.logger.warn(`Token de réinitialisation invalide`);
      throw new BadRequestException('Token de réinitialisation invalide ou expiré');
    }

    if (resetToken.used) {
      this.logger.warn(`Tentative d'utilisation d'un token déjà utilisé`);
      throw new BadRequestException('Ce lien de réinitialisation a déjà été utilisé');
    }

    if (new Date() > resetToken.expiresAt) {
      this.logger.warn(`Token de réinitialisation expiré`);
      throw new BadRequestException('Ce lien de réinitialisation a expiré');
    }

    // Mettre à jour le mot de passe
    await this.usersService.updatePassword(resetToken.userId, resetPasswordDto.newPassword);

    // Marquer le token comme utilisé
    resetToken.used = true;
    await this.passwordResetTokenRepository.save(resetToken);

    this.logger.log(`Mot de passe réinitialisé avec succès pour l'utilisateur: ${resetToken.userId}`);

    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  async getUserProfile(userId: string) {
    this.logger.log(`getUserProfile userId=${userId}`);
    return await this.usersService.findOne(userId);
  }
}

