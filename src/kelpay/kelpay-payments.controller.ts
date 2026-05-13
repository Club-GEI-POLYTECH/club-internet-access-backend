import { Body, Controller, Logger, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { KelpayPaymentOrchestratorService } from './kelpay-payment-orchestrator.service';
import { InitiateKelpayPaymentDto } from './dto/initiate-kelpay-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../entities/user.entity';

@ApiTags('Kelpay')
@Controller('payments')
export class KelpayPaymentsController {
  private readonly logger = new Logger(KelpayPaymentsController.name);

  constructor(private readonly kelpayOrchestrator: KelpayPaymentOrchestratorService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Initier un paiement Mobile Money (KELPAY)',
    description:
      'Réserve le ticket, crée un paiement PENDING, appelle KELPAY puis enchaîne un polling serveur sur checktransaction (pas de webhook Kelpay utilisé par ce flux).',
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
}
