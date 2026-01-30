import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { TicketTypesService } from './ticket-types.service';
import { PurchaseTicketDto } from './dto/purchase-ticket.dto';
import { ImportTicketsDto } from './dto/import-tickets.dto';
import { PaymentWebhookDto } from './dto/payment-webhook.dto';
import { TicketsWebhookService } from './tickets-webhook.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { TicketStatus } from '../entities/ticket.entity';

@ApiTags('Tickets')
@Controller('tickets')
export class TicketsController {
  private readonly logger = new Logger(TicketsController.name);

  constructor(
    private readonly ticketsService: TicketsService,
    private readonly ticketTypesService: TicketTypesService,
    private readonly ticketsWebhookService: TicketsWebhookService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Liste tous les tickets (avec filtres optionnels)' })
  @ApiQuery({ name: 'status', required: false, enum: TicketStatus, description: 'Filtrer par statut' })
  @ApiResponse({ status: 200, description: 'Liste des tickets' })
  async findAll(@Query('status') status?: TicketStatus) {
    this.logger.log(`GET /tickets${status ? `?status=${status}` : ''}`);
    const tickets = await this.ticketsService.findAll(status);
    // Masquer les mots de passe dans la liste
    return tickets.map((ticket) => ({
      ...ticket,
      password: '***',
    }));
  }

  @Get('available')
  @ApiOperation({ summary: 'Liste uniquement les tickets disponibles à la vente' })
  @ApiResponse({ status: 200, description: 'Liste des tickets disponibles' })
  async findAvailable() {
    this.logger.log('GET /tickets/available');
    const tickets = await this.ticketsService.findAvailable();
    return tickets.map((ticket) => ({
      ...ticket,
      password: '***',
    }));
  }

  @Get('types')
  @ApiOperation({ summary: 'Liste tous les types de tickets avec leur nombre disponible (ex: page /home)' })
  @ApiResponse({ status: 200, description: 'Liste des types de tickets (name, price, timeLimit, dataLimit, availableCount)' })
  async getTicketTypes() {
    this.logger.log('GET /tickets/types');
    return await this.ticketTypesService.findAllWithCounts();
  }

  @Get('types/:id')
  @ApiOperation({ summary: 'Détail d\'un type de ticket par ID' })
  @ApiResponse({ status: 200, description: 'Type de ticket avec availableCount' })
  @ApiResponse({ status: 404, description: 'Type non trouvé' })
  async getTicketTypeById(@Param('id') id: string) {
    this.logger.log(`GET /tickets/types/${id}`);
    return await this.ticketTypesService.findOneWithCount(id);
  }

  @Get('type/:typeId')
  @ApiOperation({ summary: 'Liste tous les tickets disponibles d\'un type spécifique' })
  @ApiResponse({ status: 200, description: 'Liste des tickets du type' })
  async findByType(@Param('typeId') typeId: string) {
    this.logger.log(`GET /tickets/type/${typeId}`);
    const tickets = await this.ticketsService.findAvailableByType(typeId);
    return tickets.map((ticket) => ({
      ...ticket,
      password: '***',
    }));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupère un ticket spécifique' })
  @ApiResponse({ status: 200, description: 'Détails du ticket' })
  @ApiResponse({ status: 404, description: 'Ticket non trouvé' })
  async findOne(@Param('id') id: string) {
    this.logger.log(`GET /tickets/${id}`);
    const ticket = await this.ticketsService.findOne(id);
    return {
      ...ticket,
      password: '***', // Ne pas exposer avant achat
    };
  }

  @Post('purchase')
  @ApiOperation({ summary: 'Achète un ticket (publique)' })
  @ApiResponse({
    status: 201,
    description: 'Ticket acheté avec succès',
    schema: {
      example: {
        ticket: {
          id: 'uuid',
          username: 'dzpv',
          password: '***',
          profile: 'TEST',
          status: 'reserved',
          price: 5000,
        },
        payment: {
          id: 'payment-uuid',
          amount: 5000,
          method: 'mobile_money',
          status: 'pending',
          phoneNumber: '+243900000000',
        },
        credentials: {
          username: 'dzpv',
          password: '3552',
          profile: 'TEST',
          instructions: 'Connectez-vous au Wi-Fi...',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Ticket non disponible' })
  @ApiResponse({ status: 404, description: 'Ticket non trouvé' })
  @ApiBody({ type: PurchaseTicketDto })
  async purchase(@Body() purchaseDto: PurchaseTicketDto) {
    this.logger.log(`POST /tickets/purchase ticketId=${purchaseDto.ticketId}`);
    return await this.ticketsService.purchase(
      purchaseDto.ticketId,
      purchaseDto.phoneNumber,
      purchaseDto.method,
    );
  }

  @Post(':id/reserve')
  @ApiOperation({ summary: 'Réserve un ticket temporairement' })
  @ApiResponse({ status: 200, description: 'Ticket réservé' })
  @ApiResponse({ status: 400, description: 'Ticket non disponible' })
  async reserve(@Param('id') id: string) {
    this.logger.log(`POST /tickets/${id}/reserve`);
    const ticket = await this.ticketsService.reserve(id);
    return {
      ...ticket,
      password: '***',
    };
  }

  @Post(':id/release')
  @ApiOperation({ summary: 'Libère un ticket réservé' })
  @ApiResponse({ status: 200, description: 'Ticket libéré' })
  @ApiResponse({ status: 400, description: 'Ticket non réservé' })
  async release(@Param('id') id: string) {
    this.logger.log(`POST /tickets/${id}/release`);
    const ticket = await this.ticketsService.release(id);
    return {
      ...ticket,
      password: '***',
    };
  }

  // Endpoints Admin

  @Post('admin/import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Importe des tickets depuis un fichier CSV (Admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Fichier CSV avec les tickets',
        },
        defaultPrice: {
          type: 'number',
          description: 'Prix par défaut pour les tickets sans type',
          example: 5000,
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiResponse({ status: 201, description: 'Tickets importés avec succès' })
  @ApiResponse({ status: 400, description: 'Fichier invalide' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  async importTickets(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
        ],
      }),
    )
    file: { buffer: Buffer },
    @Body() importDto?: ImportTicketsDto,
  ) {
    this.logger.log('POST /tickets/admin/import');
    const csvContent = file.buffer.toString('utf-8');
    return await this.ticketsService.importFromCSV(csvContent, importDto?.defaultPrice);
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Statistiques sur les tickets (Admin)' })
  @ApiResponse({ status: 200, description: 'Statistiques des tickets' })
  async getStats() {
    this.logger.log('GET /tickets/admin/stats');
    return await this.ticketsService.getStats();
  }

  @Put('admin/:id/price')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifie le prix d\'un ticket (Admin)' })
  @ApiResponse({ status: 200, description: 'Prix modifié' })
  @ApiResponse({ status: 404, description: 'Ticket non trouvé' })
  async updatePrice(@Param('id') id: string, @Body('price') price: number) {
    this.logger.log(`PUT /tickets/admin/${id}/price`);
    const ticket = await this.ticketsService.updatePrice(id, price);
    return {
      ...ticket,
      password: '***',
    };
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprime un ticket (Admin)' })
  @ApiResponse({ status: 200, description: 'Ticket supprimé' })
  @ApiResponse({ status: 404, description: 'Ticket non trouvé' })
  async remove(@Param('id') id: string) {
    this.logger.log(`DELETE /tickets/admin/${id}`);
    await this.ticketsService.remove(id);
    return { message: 'Ticket deleted successfully' };
  }

  @Post('webhook/payment')
  @ApiOperation({ summary: 'Webhook pour les mises à jour de paiement' })
  @ApiBody({ type: PaymentWebhookDto })
  @ApiResponse({ status: 200, description: 'Webhook traité avec succès' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  async handlePaymentWebhook(@Body() webhookDto: PaymentWebhookDto) {
    this.logger.log(`POST /tickets/webhook/payment paymentId=${webhookDto.paymentId} status=${webhookDto.status}`);
    await this.ticketsWebhookService.handlePaymentWebhook(
      webhookDto.paymentId,
      webhookDto.status,
    );
    return { message: 'Webhook processed successfully' };
  }
}
