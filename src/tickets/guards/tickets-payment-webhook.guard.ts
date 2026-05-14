import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';

/**
 * Protège `POST /tickets/webhook/payment` : en-tête `X-Payment-Webhook-Secret`
 * doit égaler `TICKETS_PAYMENT_WEBHOOK_SECRET` (variable d’environnement obligatoire).
 */
@Injectable()
export class TicketsPaymentWebhookGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = (this.configService.get<string>('TICKETS_PAYMENT_WEBHOOK_SECRET') ?? '').trim();
    if (!secret) {
      throw new ServiceUnavailableException(
        'Webhook ticket/paiement désactivé : définissez TICKETS_PAYMENT_WEBHOOK_SECRET dans l’environnement.',
      );
    }
    const req = context.switchToHttp().getRequest<Request>();
    const headerRaw = req.headers['x-payment-webhook-secret'];
    const header = (Array.isArray(headerRaw) ? headerRaw[0] : headerRaw ?? '').trim();
    const a = Buffer.from(header, 'utf8');
    const b = Buffer.from(secret, 'utf8');
    if (a.length !== b.length) {
      throw new UnauthorizedException('Secret webhook invalide');
    }
    if (!timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Secret webhook invalide');
    }
    return true;
  }
}
