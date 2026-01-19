import { Controller, Get, Post, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentStatus } from '../entities/payment.entity';

@ApiTags('Payments')
@ApiBearerAuth('JWT-auth')
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un paiement', description: 'Crée un nouveau paiement' })
  @ApiBody({ type: CreatePaymentDto })
  @ApiResponse({ status: 201, description: 'Paiement créé avec succès' })
  @ApiResponse({ status: 400, description: 'Erreur de validation' })
  async create(@Body() createDto: CreatePaymentDto, @Request() req) {
    return await this.paymentService.create(createDto, req.user.userId);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Compléter un paiement', description: 'Complète un paiement et crée automatiquement un compte Wi-Fi si nécessaire' })
  @ApiParam({ name: 'id', description: 'UUID du paiement' })
  @ApiBody({ schema: { type: 'object', properties: { transactionId: { type: 'string', example: 'MTN123456' } } } })
  @ApiResponse({ status: 200, description: 'Paiement complété avec succès' })
  @ApiResponse({ status: 404, description: 'Paiement non trouvé' })
  async completePayment(@Param('id') id: string, @Body() body: { transactionId?: string }) {
    return await this.paymentService.completePayment(id, body.transactionId);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Mettre à jour le statut', description: 'Met à jour le statut d\'un paiement' })
  @ApiParam({ name: 'id', description: 'UUID du paiement' })
  @ApiBody({ schema: { type: 'object', properties: { status: { enum: Object.values(PaymentStatus), example: PaymentStatus.COMPLETED } } } })
  @ApiResponse({ status: 200, description: 'Statut mis à jour avec succès' })
  @ApiResponse({ status: 404, description: 'Paiement non trouvé' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: PaymentStatus },
  ) {
    return await this.paymentService.updateStatus(id, body.status);
  }

  @Get()
  @ApiOperation({ summary: 'Lister tous les paiements', description: 'Retourne la liste de tous les paiements' })
  @ApiResponse({ status: 200, description: 'Liste des paiements récupérée avec succès' })
  async findAll() {
    return await this.paymentService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtenir un paiement', description: 'Récupère les détails d\'un paiement spécifique' })
  @ApiParam({ name: 'id', description: 'UUID du paiement' })
  @ApiResponse({ status: 200, description: 'Paiement récupéré avec succès' })
  @ApiResponse({ status: 404, description: 'Paiement non trouvé' })
  async findOne(@Param('id') id: string) {
    return await this.paymentService.findOne(id);
  }

  @Get('transaction/:transactionId')
  @ApiOperation({ summary: 'Trouver par transaction ID', description: 'Trouve un paiement par son ID de transaction' })
  @ApiParam({ name: 'transactionId', description: 'ID de transaction (ex: MTN123456)' })
  @ApiResponse({ status: 200, description: 'Paiement trouvé avec succès' })
  @ApiResponse({ status: 404, description: 'Paiement non trouvé' })
  async findByTransactionId(@Param('transactionId') transactionId: string) {
    return await this.paymentService.findByTransactionId(transactionId);
  }
}

