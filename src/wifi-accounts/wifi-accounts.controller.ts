import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { WiFiAccountsService } from './wifi-accounts.service';
import { CreateWiFiAccountDto } from './dto/create-wifi-account.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@ApiTags('WiFi Accounts')
@ApiBearerAuth('JWT-auth')
@Controller('wifi-accounts')
@UseGuards(JwtAuthGuard)
export class WiFiAccountsController {
  private readonly logger = new Logger(WiFiAccountsController.name);

  constructor(private readonly wifiAccountsService: WiFiAccountsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Créer un compte Wi-Fi', description: 'Crée un nouveau compte Wi-Fi dans la base de données et dans MikroTik (admin et agent uniquement)' })
  @ApiBody({ type: CreateWiFiAccountDto })
  @ApiResponse({ status: 201, description: 'Compte Wi-Fi créé avec succès' })
  @ApiResponse({ status: 400, description: 'Erreur de validation' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  async create(@Body() createDto: CreateWiFiAccountDto, @Request() req) {
    this.logger.log(`POST /wifi-accounts userId=${req.user?.userId}`);
    return await this.wifiAccountsService.create(createDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les comptes Wi-Fi', description: 'Retourne la liste des comptes Wi-Fi. Les étudiants voient uniquement leurs propres comptes.' })
  @ApiResponse({ status: 200, description: 'Liste des comptes Wi-Fi récupérée avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async findAll(@Request() req) {
    this.logger.log(`GET /wifi-accounts userId=${req.user?.userId} role=${req.user?.role}`);
    return await this.wifiAccountsService.findAll(req.user?.userId, req.user?.role);
  }

  @Get('active')
  @ApiOperation({ summary: 'Lister les comptes actifs', description: 'Retourne uniquement les comptes Wi-Fi actifs (non expirés). Les étudiants voient uniquement leurs propres comptes actifs.' })
  @ApiResponse({ status: 200, description: 'Liste des comptes actifs récupérée avec succès' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async getActive(@Request() req) {
    this.logger.log(`GET /wifi-accounts/active userId=${req.user?.userId}`);
    return await this.wifiAccountsService.getActiveAccounts(req.user?.userId, req.user?.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtenir un compte Wi-Fi', description: 'Récupère les détails d\'un compte Wi-Fi spécifique. Les étudiants ne peuvent voir que leurs propres comptes.' })
  @ApiParam({ name: 'id', description: 'UUID du compte Wi-Fi' })
  @ApiResponse({ status: 200, description: 'Compte Wi-Fi récupéré avec succès' })
  @ApiResponse({ status: 404, description: 'Compte Wi-Fi non trouvé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async findOne(@Param('id') id: string, @Request() req) {
    this.logger.log(`GET /wifi-accounts/${id}`);
    return await this.wifiAccountsService.findOne(id, req.user?.userId, req.user?.role);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un compte Wi-Fi', description: 'Supprime un compte Wi-Fi de la base de données et de MikroTik' })
  @ApiParam({ name: 'id', description: 'UUID du compte Wi-Fi' })
  @ApiResponse({ status: 200, description: 'Compte Wi-Fi supprimé avec succès' })
  @ApiResponse({ status: 404, description: 'Compte Wi-Fi non trouvé' })
  async delete(@Param('id') id: string) {
    this.logger.log(`DELETE /wifi-accounts/${id}`);
    await this.wifiAccountsService.delete(id);
    return { message: 'WiFi account deleted successfully' };
  }
}

