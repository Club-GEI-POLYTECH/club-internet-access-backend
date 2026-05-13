import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';

type MailPayload = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly smtpConfigured: boolean;
  private readonly resend: Resend | null;
  /** Au moins un canal d’envoi utilisable (Resend ou SMTP). */
  private readonly mailConfigured: boolean;

  constructor(private configService: ConfigService) {
    const resendKey = (this.configService.get<string>('RESEND_API_KEY') ?? '').trim();
    this.resend = resendKey ? new Resend(resendKey) : null;

    const host = (this.configService.get<string>('SMTP_HOST') ?? '').trim() || 'localhost';
    const port = parseInt(this.configService.get<string>('SMTP_PORT') || '1025', 10);
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const isLocalhost = !host || host === 'localhost' || host === '127.0.0.1';
    this.smtpConfigured = host === 'mailhog' || (!isProduction || !isLocalhost);

    this.mailConfigured = !!this.resend || this.smtpConfigured;

    if (isProduction && !this.mailConfigured) {
      this.logger.warn(
        'Aucun envoi email configuré en production. Définissez RESEND_API_KEY ou SMTP_HOST / SMTP_PORT (hors localhost).',
      );
    }

    if (this.resend) {
      this.logger.log('Emails : transport Resend (RESEND_API_KEY défini).');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth:
        this.configService.get<string>('SMTP_USER') && this.configService.get<string>('SMTP_PASS')
          ? {
              user: this.configService.get<string>('SMTP_USER'),
              pass: this.configService.get<string>('SMTP_PASS'),
            }
          : undefined,
    });
  }

  private fromHeader(appName: string): string {
    const addr =
      (this.configService.get<string>('RESEND_FROM') ?? '').trim() ||
      (this.configService.get<string>('SMTP_FROM') ?? '').trim() ||
      'noreply@unikin.cd';
    return `"${appName}" <${addr}>`;
  }

  private async dispatchMail(payload: MailPayload, context: string): Promise<void> {
    if (this.resend) {
      const { data, error } = await this.resend.emails.send({
        from: payload.from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });
      if (error) {
        this.logger.error(`Resend (${context}): ${error.message}`);
        throw new Error(error.message);
      }
      this.logger.log(`✅ Resend OK id=${data?.id ?? '?'} (${context}) → ${payload.to}`);
      return;
    }

    if (!this.smtpConfigured) {
      const msg =
        'SMTP non configuré en production. Définissez RESEND_API_KEY ou SMTP_HOST, SMTP_PORT, SMTP_USER et SMTP_PASS.';
      this.logger.error(msg);
      throw new Error(msg);
    }

    await this.transporter.sendMail(payload);
    this.logger.log(`✅ SMTP OK (${context}) → ${payload.to}`);
  }

  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetUrl: string,
  ): Promise<void> {
    this.logger.log(`sendPasswordResetEmail to=${email}`);
    const appName = this.configService.get<string>('APP_NAME', 'Club Internet Access UNIKIN');

    const payload: MailPayload = {
      from: this.fromHeader(appName),
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

    if (!this.mailConfigured) {
      const msg =
        'Aucun transport email (Resend ou SMTP). Définissez RESEND_API_KEY ou la configuration SMTP.';
      this.logger.error(msg);
      throw new Error(msg);
    }

    try {
      await this.dispatchMail(payload, 'password-reset');
    } catch (error: any) {
      this.logger.error(`❌ Erreur lors de l'envoi de l'email à ${email}: ${error.message}`);
      throw error;
    }
  }

  async sendRegistrationVerificationEmail(
    email: string,
    firstName: string,
    code: string,
  ): Promise<void> {
    this.logger.log(`sendRegistrationVerificationEmail to=${email}`);
    const appName = this.configService.get<string>('APP_NAME', 'Club Internet Access UNIKIN');
    const mins = this.configService.get<string>('REGISTRATION_CODE_EXPIRES_MINUTES', '15');

    const payload: MailPayload = {
      from: this.fromHeader(appName),
      to: email,
      subject: `Votre code d’inscription — ${appName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <p>Bonjour ${firstName},</p>
          <p>Voici votre code de vérification pour finaliser la création de votre compte <strong>${appName}</strong> :</p>
          <p style="font-size: 28px; letter-spacing: 8px; font-weight: bold; color: #1e40af;">${code}</p>
          <p>Ce code est valable <strong>${mins} minutes</strong>.</p>
          <p>Si vous n’avez pas demandé ce compte, ignorez cet email.</p>
          <p>Cordialement,<br>L’équipe ${appName}</p>
        </body>
        </html>
      `,
      text: `Bonjour ${firstName},\n\nCode de vérification : ${code}\n\nValable ${mins} minutes.\n\n— ${appName}`,
    };

    if (!this.mailConfigured) {
      const msg =
        'Aucun transport email (Resend ou SMTP). Définissez RESEND_API_KEY ou la configuration SMTP.';
      this.logger.error(msg);
      throw new Error(msg);
    }

    try {
      await this.dispatchMail(payload, 'registration-code');
    } catch (error: any) {
      this.logger.error(`❌ Erreur envoi email inscription ${email}: ${error.message}`);
      throw error;
    }
  }
}
