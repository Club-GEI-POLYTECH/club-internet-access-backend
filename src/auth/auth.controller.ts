import { Controller, Post, Body, UseGuards, Request, Get, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Request() req, @Body() loginDto: LoginDto) {
    this.logger.log(`Requête de connexion reçue pour: ${loginDto.email}`);
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
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
  @HttpCode(HttpStatus.OK)
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

