import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

/**
 * Couche Resend unique (équivalent EmailService / pattern « common »).
 * Variables : RESEND_API_KEY, RESEND_FROM_EMAIL (ou RESEND_FROM), optionnel défaut local.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;
  private readonly mailConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const resendApiKey = (this.configService.get<string>('RESEND_API_KEY') ?? '').trim();
    this.fromEmail = this.resolveFromEmail();

    if (!resendApiKey) {
      this.resend = null;
      this.logger.warn(
        '⚠️  RESEND_API_KEY non configurée : aucun email ne pourra être envoyé.',
      );
    } else {
      this.resend = new Resend(resendApiKey);
      this.logger.log('✅ API Resend initialisée (clé présente).');
    }

    this.mailConfigured = !!this.resend && !!this.fromEmail;

    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    if (isProduction && !this.mailConfigured) {
      this.logger.warn(
        'Emails désactivés en production : définissez RESEND_API_KEY et RESEND_FROM_EMAIL (domaine vérifié Resend).',
      );
    } else if (this.resend && !this.fromEmail) {
      this.logger.warn(
        '⚠️  RESEND_API_KEY défini mais pas d’expéditeur : renseignez RESEND_FROM_EMAIL ou RESEND_FROM.',
      );
    } else if (this.mailConfigured) {
      this.logger.log(`✅ Expéditeur Resend : ${this.fromEmail}`);
    }
  }

  /** Priorité : RESEND_FROM_EMAIL, puis RESEND_FROM, puis défaut local (comme l’app de référence). */
  private resolveFromEmail(): string {
    const explicit =
      (this.configService.get<string>('RESEND_FROM_EMAIL') ?? '').trim() ||
      (this.configService.get<string>('RESEND_FROM') ?? '').trim();
    if (explicit) {
      return explicit;
    }
    return (
      this.configService.get<string>('NODE_ENV') === 'production' ? '' : 'noreply@school.local'
    ).trim();
  }

  private async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    context: string;
  }): Promise<void> {
    if (!this.resend) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    if (!this.fromEmail) {
      throw new Error(
        'RESEND_FROM_EMAIL (ou RESEND_FROM) doit être défini : adresse autorisée dans Resend.',
      );
    }

    const { error, data } = await this.resend.emails.send({
      from: this.fromEmail,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (error) {
      this.logger.error(`Resend (${params.context}): ${error.message}`);
      throw new Error(`Resend error: ${error.message}`);
    }

    this.logger.log(`✅ Email envoyé (${params.context}) id=${data?.id ?? '?'} → ${params.to}`);
  }

  verifyConnection(): boolean {
    if (!this.mailConfigured) {
      this.logger.error(
        'Configuration Resend incomplète : RESEND_API_KEY et RESEND_FROM_EMAIL (ou expéditeur explicite) requis.',
      );
      return false;
    }
    this.logger.log('✅ Resend configuration verified');
    return true;
  }

  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetUrl: string,
  ): Promise<void> {
    this.logger.log(`sendPasswordResetEmail to=${email}`);
    const appName = this.configService.get<string>('APP_NAME', 'Club Internet Access UNIKIN');

    if (!this.mailConfigured) {
      const msg =
        'Aucun envoi email : définissez RESEND_API_KEY et RESEND_FROM_EMAIL (domaine vérifié Resend).';
      this.logger.error(msg);
      throw new Error(msg);
    }

    const subject = 'Réinitialisation de votre mot de passe';
    const html = `
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
      `;
    const text = `
        Bonjour ${firstName},
        
        Vous avez demandé la réinitialisation de votre mot de passe pour votre compte ${appName}.
        
        Cliquez sur ce lien pour réinitialiser votre mot de passe :
        ${resetUrl}
        
        Ce lien est valide pendant 1 heure.
        
        Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
        
        Cordialement,
        L'équipe ${appName}
      `;

    try {
      await this.sendEmail({ to: email, subject, html, text, context: 'password-reset' });
    } catch (error: any) {
      this.logger.error(`Échec envoi email réinitialisation → ${email}: ${error?.message ?? error}`);
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

    if (!this.mailConfigured) {
      const msg =
        'Aucun envoi email : définissez RESEND_API_KEY et RESEND_FROM_EMAIL (domaine vérifié Resend).';
      this.logger.error(msg);
      throw new Error(msg);
    }

    const subject = `Votre code d’inscription — ${appName}`;
    const html = `
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
      `;
    const text = `Bonjour ${firstName},\n\nCode de vérification : ${code}\n\nValable ${mins} minutes.\n\n— ${appName}`;

    try {
      await this.sendEmail({ to: email, subject, html, text, context: 'registration-code' });
    } catch (error: any) {
      this.logger.error(`Échec envoi email inscription → ${email}: ${error?.message ?? error}`);
      throw error;
    }
  }

  /** Notification générique (HTML simple), même idée que l’app de référence. */
  async sendNotificationEmail(to: string, subject: string, message: string): Promise<void> {
    if (!this.mailConfigured) {
      throw new Error('Resend non configuré (clé + expéditeur).');
    }
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${subject}</h2>
          <div style="margin: 20px 0;">${message}</div>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px;">Cet email a été envoyé automatiquement.</p>
        </div>
      `;
    await this.sendEmail({ to, subject, html, text: message.replace(/<[^>]*>/g, ' ').trim() || subject, context: 'notification' });
  }
}
