import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    // Configuration pour MailHog (développement)
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'mailhog'),
      port: parseInt(this.configService.get<string>('SMTP_PORT', '1025')),
      secure: false,
      auth: this.configService.get<string>('SMTP_USER')
        ? {
            user: this.configService.get<string>('SMTP_USER'),
            pass: this.configService.get<string>('SMTP_PASS'),
          }
        : undefined,
    });
  }

  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetUrl: string,
  ): Promise<void> {
    const fromEmail = this.configService.get<string>('SMTP_FROM', 'noreply@unikin.cd');
    const appName = this.configService.get<string>('APP_NAME', 'Club Internet Access UNIKIN');

    const mailOptions = {
      from: `"${appName}" <${fromEmail}>`,
      to: email,
      subject: 'Réinitialisation de votre mot de passe',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${appName}</h1>
            </div>
            <div class="content">
              <p>Bonjour ${firstName},</p>
              <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte ${appName}.</p>
              <p>Cliquez sur le bouton ci-dessous pour réinitialiser votre mot de passe :</p>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
              </p>
              <p>Ou copiez ce lien dans votre navigateur :</p>
              <p style="word-break: break-all; color: #3b82f6;">${resetUrl}</p>
              <p><strong>Ce lien est valide pendant 1 heure.</strong></p>
              <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
              <p>Cordialement,<br>L'équipe ${appName}</p>
            </div>
            <div class="footer">
              <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Bonjour ${firstName},
        
        Vous avez demandé la réinitialisation de votre mot de passe pour votre compte ${appName}.
        
        Cliquez sur ce lien pour réinitialiser votre mot de passe :
        ${resetUrl}
        
        Ce lien est valide pendant 1 heure.
        
        Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
        
        Cordialement,
        L'équipe ${appName}
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Email de réinitialisation envoyé à: ${email}`);
    } catch (error: any) {
      this.logger.error(`❌ Erreur lors de l'envoi de l'email à ${email}: ${error.message}`);
      throw error;
    }
  }
}

