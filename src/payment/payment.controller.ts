import { Controller, Get, Post, Put, Body, Param, UseGuards, Request, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { PaymentStatus } from '../entities/payment.entity';

@ApiTags('Payments')
@ApiBearerAuth('JWT-auth')
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Post(':id/complete')
  @ApiOperation({
    summary: 'Compléter un paiement (ex. ticket)',
    description:
      'Marque le paiement comme **complété** et finalise la vente du ticket si applicable. **Admin / agent** : tout paiement complétable. **Étudiant** : uniquement **ses** paiements ; carte (hors Kelpay) en attente OK ; **Mobile Money Kelpay** encore `pending`/`processing` → utiliser `POST .../kelpay/confirm` ; si déjà `success` (Kelpay), cet appel peut passer le paiement en `completed` (idempotent si déjà `completed`).',
  })
  @ApiParam({ name: 'id', description: 'UUID du paiement' })
  @ApiBody({
    schema: { type: 'object', properties: { transactionId: { type: 'string', example: 'MTN123456' } } },
  })
  @ApiResponse({ status: 200, description: 'Paiement complété avec succès' })
  @ApiResponse({ status: 400, description: 'Paiement non complétable ou Kelpay encore ouvert (étudiant)' })
  @ApiResponse({ status: 403, description: 'Étudiant : paiement d’un autre utilisateur' })
  @ApiResponse({ status: 404, description: 'Paiement non trouvé' })
  async completePayment(
    @Param('id') id: string,
    @Body() body: { transactionId?: string },
    @Request() req: { user: { userId: string; role: UserRole } },
  ) {
    this.logger.log(`POST /payments/${id}/complete transactionId=${body?.transactionId ?? 'none'}`);
    return await this.paymentService.completePayment(id, body.transactionId, {
      userId: req.user.userId,
      role: req.user.role,
    });
  }

  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({
    summary: 'Mettre à jour le statut',
    description: 'Met à jour le statut (ex. failed pour libérer un ticket réservé)',
  })
  @ApiParam({ name: 'id', description: 'UUID du paiement' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { status: { enum: Object.values(PaymentStatus), example: PaymentStatus.COMPLETED } },
    },
  })
  @ApiResponse({ status: 200, description: 'Statut mis à jour avec succès' })
  @ApiResponse({ status: 404, description: 'Paiement non trouvé' })
  async updateStatus(@Param('id') id: string, @Body() body: { status: PaymentStatus }) {
    this.logger.log(`PUT /payments/${id}/status status=${body.status}`);
    return await this.paymentService.updateStatus(id, body.status);
  }

  @Get()
  @ApiOperation({
    summary: 'Lister les paiements',
    description: 'Les étudiants ne voient que leurs paiements (createdById)',
  })
  @ApiResponse({ status: 200, description: 'Liste des paiements' })
  async findAll(@Request() req) {
    this.logger.log(`GET /payments userId=${req.user?.userId} role=${req.user?.role}`);
    return await this.paymentService.findAll(req.user?.userId, req.user?.role);
  }

  @Get('transaction/:transactionId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Trouver par ID de transaction', description: 'Recherche admin / agent' })
  @ApiParam({ name: 'transactionId', description: 'ID transaction (ex. MTN123456)' })
  async findByTransactionId(@Param('transactionId') transactionId: string) {
    this.logger.log(`GET /payments/transaction/${transactionId}`);
    return await this.paymentService.findByTransactionId(transactionId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un paiement' })
  @ApiParam({ name: 'id', description: 'UUID du paiement' })
  async findOne(@Param('id') id: string, @Request() req) {
    this.logger.log(`GET /payments/${id}`);
    return await this.paymentService.findOne(id, req.user?.userId, req.user?.role);
  }
}
