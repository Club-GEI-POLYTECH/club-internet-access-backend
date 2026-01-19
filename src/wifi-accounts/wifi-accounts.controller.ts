import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { WiFiAccountsService } from './wifi-accounts.service';
import { CreateWiFiAccountDto } from './dto/create-wifi-account.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('WiFi Accounts')
@ApiBearerAuth('JWT-auth')
@Controller('wifi-accounts')
@UseGuards(JwtAuthGuard)
export class WiFiAccountsController {
  constructor(private readonly wifiAccountsService: WiFiAccountsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un compte Wi-Fi', description: 'Crée un nouveau compte Wi-Fi dans la base de données et dans MikroTik' })
  @ApiBody({ type: CreateWiFiAccountDto })
  @ApiResponse({ status: 201, description: 'Compte Wi-Fi créé avec succès' })
  @ApiResponse({ status: 400, description: 'Erreur de validation' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async create(@Body() createDto: CreateWiFiAccountDto, @Request() req) {
    return await this.wifiAccountsService.create(createDto, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Lister tous les comptes Wi-Fi', description: 'Retourne la liste de tous les comptes Wi-Fi' })
  @ApiResponse({ status: 200, description: 'Liste des comptes Wi-Fi récupérée avec succès' })
  async findAll() {
    return await this.wifiAccountsService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Lister les comptes actifs', description: 'Retourne uniquement les comptes Wi-Fi actifs (non expirés)' })
  @ApiResponse({ status: 200, description: 'Liste des comptes actifs récupérée avec succès' })
  async getActive() {
    return await this.wifiAccountsService.getActiveAccounts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtenir un compte Wi-Fi', description: 'Récupère les détails d\'un compte Wi-Fi spécifique' })
  @ApiParam({ name: 'id', description: 'UUID du compte Wi-Fi' })
  @ApiResponse({ status: 200, description: 'Compte Wi-Fi récupéré avec succès' })
  @ApiResponse({ status: 404, description: 'Compte Wi-Fi non trouvé' })
  async findOne(@Param('id') id: string) {
    return await this.wifiAccountsService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un compte Wi-Fi', description: 'Supprime un compte Wi-Fi de la base de données et de MikroTik' })
  @ApiParam({ name: 'id', description: 'UUID du compte Wi-Fi' })
  @ApiResponse({ status: 200, description: 'Compte Wi-Fi supprimé avec succès' })
  @ApiResponse({ status: 404, description: 'Compte Wi-Fi non trouvé' })
  async delete(@Param('id') id: string) {
    await this.wifiAccountsService.delete(id);
    return { message: 'WiFi account deleted successfully' };
  }
}

