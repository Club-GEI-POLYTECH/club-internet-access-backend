import { Controller, Post, Body, UseGuards, Request, Get, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterRequestDto } from './dto/register-request.dto';
import { RegisterVerifyDto } from './dto/register-verify.dto';
import { RegisterResendDto } from './dto/register-resend.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Post('register/request')
  @Throttle({ default: { limit: 8, ttl: 3_600_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Demander une inscription (étape 1)',
    description:
      'Valide l’email et envoie un code à 6 chiffres. Le compte n’est créé qu’après POST /auth/register/verify.',
  })
  @ApiBody({ type: RegisterRequestDto })
  @ApiResponse({ status: 200, description: 'Code envoyé (ou message générique)' })
  @ApiResponse({ status: 400, description: 'Validation ou envoi email impossible' })
  @ApiResponse({ status: 409, description: 'Email déjà enregistré' })
  async registerRequest(@Body() dto: RegisterRequestDto) {
    this.logger.log(`POST /auth/register/request email=${dto.email}`);
    return this.authService.requestRegistration(dto);
  }

  @Post('register/verify')
  @Throttle({ default: { limit: 40, ttl: 900_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Vérifier le code et finaliser l’inscription (étape 2)',
    description: 'Vérifie le code reçu par email puis crée le compte étudiant et retourne un JWT.',
  })
  @ApiBody({ type: RegisterVerifyDto })
  @ApiResponse({ status: 200, description: 'Compte créé, token JWT' })
  @ApiResponse({ status: 400, description: 'Code invalide, expiré ou trop de tentatives' })
  @ApiResponse({ status: 409, description: 'Email déjà enregistré' })
  async registerVerify(@Body() dto: RegisterVerifyDto) {
    this.logger.log(`POST /auth/register/verify email=${dto.email}`);
    return this.authService.verifyRegistration(dto);
  }

  @Post('register/resend')
  @Throttle({ default: { limit: 6, ttl: 3_600_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Renvoyer le code d’inscription',
    description: 'Pour une demande d’inscription non expirée, génère un nouveau code et réinitialise les essais.',
  })
  @ApiBody({ type: RegisterResendDto })
  @ApiResponse({ status: 200, description: 'Nouveau code envoyé' })
  @ApiResponse({ status: 400, description: 'Aucune demande en cours ou expirée' })
  async registerResend(@Body() dto: RegisterResendDto) {
    this.logger.log(`POST /auth/register/resend email=${dto.email}`);
    return this.authService.resendRegistrationCode(dto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @Throttle({ default: { limit: 25, ttl: 900_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Se connecter', description: 'Authentification et obtention d\'un token JWT' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Connexion réussie',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid' },
            email: { type: 'string', example: 'admin@unikin.cd' },
            firstName: { type: 'string', example: 'Admin' },
            lastName: { type: 'string', example: 'UNIKIN' },
            role: { type: 'string', example: 'admin' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  async login(@Request() req, @Body() loginDto: LoginDto) {
    this.logger.log(`Requête de connexion reçue pour: ${loginDto.email}`);
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Obtenir le profil', description: 'Récupère le profil de l\'utilisateur connecté' })
  @ApiResponse({ status: 200, description: 'Profil utilisateur récupéré avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async getProfile(@Request() req) {
    this.logger.log(`GET /auth/profile userId=${req.user?.userId}`);
    const user = await this.authService.getUserProfile(req.user.userId);
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 8, ttl: 3_600_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Demander une réinitialisation', description: 'Demande une réinitialisation de mot de passe par email' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Email envoyé si l\'adresse existe',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Si cet email existe, un lien de réinitialisation a été envoyé' },
      },
    },
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    this.logger.log(`Demande de réinitialisation de mot de passe pour: ${forgotPasswordDto.email}`);
    try {
      return await this.authService.requestPasswordReset(forgotPasswordDto);
    } catch (error: any) {
      this.logger.error(`Erreur lors de la demande de réinitialisation pour: ${forgotPasswordDto.email}`, error.stack);
      // On ne révèle pas l'erreur pour des raisons de sécurité
      return { message: 'Si cet email existe, un lien de réinitialisation a été envoyé' };
    }
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 20, ttl: 3_600_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Réinitialiser le mot de passe', description: 'Réinitialise le mot de passe avec un token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Mot de passe réinitialisé avec succès',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Mot de passe réinitialisé avec succès' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Token invalide ou expiré' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    this.logger.log(`Tentative de réinitialisation de mot de passe avec token`);
    try {
      return await this.authService.resetPassword(resetPasswordDto);
    } catch (error: any) {
      this.logger.error(`Erreur lors de la réinitialisation de mot de passe`, error.stack);
      throw error;
    }
  }
}

