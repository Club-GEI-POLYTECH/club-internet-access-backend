import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordResetToken } from '../entities/password-reset-token.entity';

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
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
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

  async register(registerDto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    const { password, ...result } = user;
    return result;
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
}

