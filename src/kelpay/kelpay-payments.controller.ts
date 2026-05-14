import { Body, Controller, HttpCode, Logger, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { KelpayPaymentOrchestratorService } from './kelpay-payment-orchestrator.service';
import { InitiateKelpayPaymentDto } from './dto/initiate-kelpay-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../entities/user.entity';
import { KELPAY_CHECK_TRANSACTION_URL } from './kelpay.constants';
import {
  isKelpayCallbackClientIpAllowed,
  parseKelpayCallbackAllowedIps,
} from './kelpay-callback-ip.util';

@ApiTags('Kelpay')
@Controller('payments')
export class KelpayPaymentsController {
  private readonly logger = new Logger(KelpayPaymentsController.name);

  constructor(
    private readonly kelpayOrchestrator: KelpayPaymentOrchestratorService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Public — pas de JWT. KELPAY envoie souvent `application/x-www-form-urlencoded` ou JSON.
   * Réponse obligatoire : corps texte `OK` (voir doc Keccel).
   */
  @Post('callback')
  @SkipThrottle()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Callback KELPAY (notification de paiement)',
    description:
      'Endpoint appelé par Kelpay après paiement (succès ou échec). Pas d’authentification Bearer. Le corps peut être du JSON ou du formulaire (champs typiques : reference, transactionid, transactionstatus, amount). Réponse : texte brut `OK`. Si `KELPAY_CALLBACK_ALLOWED_IPS` est défini, les callbacks depuis une autre IP sont ignorés (réponse toujours `OK`).',
  })
  @ApiResponse({ status: 200, description: 'Corps : OK (text/plain)' })
  async kelpayCallback(
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(
      `[KELPAY → backend] callback HTTP entrant content-type=${String(req.headers['content-type'])} content-length=${String(req.headers['content-length'] ?? 'n/a')} ip=${req.ip ?? 'n/a'}`,
    );
    const allowedIps = parseKelpayCallbackAllowedIps(
      this.configService.get<string>('KELPAY_CALLBACK_ALLOWED_IPS'),
    );
    if (!isKelpayCallbackClientIpAllowed(req.ip, allowedIps)) {
      this.logger.warn(
        `KELPAY callback ignoré (IP non autorisée). ip=${req.ip ?? 'n/a'} allowed=${allowedIps.join(',')}`,
      );
      res.type('text/plain; charset=utf-8').send('OK');
      return;
    }
    try {
      await this.kelpayOrchestrator.handleKelpayCallback(body);
    } catch (err: unknown) {
      this.logger.error(
        `KELPAY callback erreur interne: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    this.logger.log('[backend → KELPAY] callback réponse: HTTP 200 Content-Type=text/plain; charset=utf-8 corps=OK');
    res.type('text/plain; charset=utf-8').send('OK');
  }

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Initier un paiement Mobile Money (KELPAY)',
    description:
      'Réponse `initiate` : `code` 0 = demande acceptée sur le réseau Kelpay, pas encore payé. Aucun `checktransaction` automatique côté serveur : enchaîner `POST .../:paymentId/kelpay/verify` puis `POST .../:paymentId/kelpay/confirm`, ou laisser le **callback** Kelpay finaliser si configuré. Tant que le paiement est `pending`/`processing`, **`POST .../:paymentId/kelpay/cancel`** permet d’abandonner et de libérer la ligne pour un nouvel achat.',
  })
  @ApiResponse({ status: 201, description: 'Paiement initié — la push MM est envoyée au client' })
  @ApiResponse({ status: 400, description: 'Ticket indisponible, montant invalide ou erreur KELPAY' })
  @ApiResponse({ status: 403, description: 'userId ne correspond pas au JWT (étudiant)' })
  async initiate(@Body() dto: InitiateKelpayPaymentDto, @Req() req: { user: { userId: string; role: UserRole } }) {
    this.logger.log(`POST /payments/initiate ticketId=${dto.ticketId} userId=${dto.userId}`);
    return this.kelpayOrchestrator.initiate(dto, {
      userId: req.user.userId,
      role: req.user.role,
    });
  }

  /**
   * Vérifie le statut de la **transaction** sur Keccel (`checktransaction.asp`), puis aligne le **paiement** en base
   * (`success` / `failed`) et le ticket. L’appel HTTP sortant est implémenté dans {@link KelpayApiClient.checkTransaction}.
   */
  @Post(':paymentId/kelpay/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Vérifier le statut de la transaction Kelpay (checktransaction)',
    description:
      `Cette route déclenche côté serveur un **POST** JSON vers la passerelle Keccel : **${KELPAY_CHECK_TRANSACTION_URL}** (corps : \`merchantcode\`, \`transactionid\` issu de l’initiation). La réponse décrit le **statut de la transaction** sur Keccel (doc : **code** 0 = succès, 1 = échec ; **transactionstatus** ex. SUCCESS / FAILED / Delivered). Ce n’est qu’à partir de ce statut « transaction OK » que le **paiement** applicatif est passé en \`success\` et le ticket vendu ; en échec → \`failed\`. Idempotent si déjà finalisé.`,
    externalDocs: {
      description: 'API Keccel — checktransaction',
      url: KELPAY_CHECK_TRANSACTION_URL,
    },
  })
  @ApiParam({ name: 'paymentId', description: 'UUID du paiement (retourné par initiate)' })
  @ApiResponse({ status: 200, description: 'Statut Kelpay + indicateur readyToConfirm' })
  @ApiResponse({ status: 400, description: 'Paiement non éligible ou erreur Kelpay' })
  @ApiResponse({ status: 403, description: 'Accès refusé (étudiant : autre utilisateur)' })
  @ApiResponse({ status: 404, description: 'Paiement introuvable' })
  async verifyKelpay(
    @Param('paymentId') paymentId: string,
    @Req() req: { user: { userId: string; role: UserRole } },
  ) {
    this.logger.log(
      `[kelpay/verify] paymentId=${paymentId} → appel Keccel POST ${KELPAY_CHECK_TRANSACTION_URL} (statut transaction passerelle ; si succès → paiement success + ticket)`,
    );
    return this.kelpayOrchestrator.verifyKelpayPayment(paymentId, {
      userId: req.user.userId,
      role: req.user.role,
    });
  }

  @Post(':paymentId/kelpay/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Confirmer le paiement Kelpay et activer le ticket',
    description:
      'Appelle `checktransaction` puis finalise SUCCESS/FAILED côté serveur (activation ticket si succès). Idempotent si le paiement est déjà SUCCESS (ex. callback arrivé avant). Si Kelpay est encore en attente → 409.',
  })
  @ApiParam({ name: 'paymentId', description: 'UUID du paiement' })
  @ApiResponse({ status: 200, description: 'Paiement finalisé ou déjà finalisé' })
  @ApiResponse({ status: 400, description: 'Échec Kelpay ou paiement non confirmable' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Paiement introuvable' })
  @ApiResponse({ status: 409, description: 'Paiement encore en attente côté Kelpay' })
  async confirmKelpay(
    @Param('paymentId') paymentId: string,
    @Req() req: { user: { userId: string; role: UserRole } },
  ) {
    this.logger.log(`POST /payments/${paymentId}/kelpay/confirm`);
    return this.kelpayOrchestrator.confirmKelpayPayment(paymentId, {
      userId: req.user.userId,
      role: req.user.role,
    });
  }

  @Post(':paymentId/kelpay/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Annuler un paiement Kelpay encore ouvert',
    description:
      'Uniquement si le statut est `pending` ou `processing` : passage à `cancelled`, libération du ticket pour le catalogue (pas d’appel Kelpay). Déjà `failed` / `cancelled` / `expired` → réponse 200 idempotente (`alreadyTerminal: true`). Succès (`success`/`completed`) → 400.',
  })
  @ApiParam({ name: 'paymentId', description: 'UUID du paiement' })
  @ApiResponse({ status: 200, description: 'Annulé ou déjà terminal' })
  @ApiResponse({ status: 400, description: 'Paiement déjà réussi' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Paiement introuvable' })
  @ApiResponse({ status: 409, description: 'Succès enregistré entre-temps (callback / confirm)' })
  async cancelKelpay(
    @Param('paymentId') paymentId: string,
    @Req() req: { user: { userId: string; role: UserRole } },
  ) {
    this.logger.log(`POST /payments/${paymentId}/kelpay/cancel`);
    return this.kelpayOrchestrator.cancelKelpayPayment(paymentId, {
      userId: req.user.userId,
      role: req.user.role,
    });
  }
}
