import { Controller, Get, Param, Query, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { BandwidthService } from './bandwidth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Bandwidth')
@ApiBearerAuth('JWT-auth')
@Controller('bandwidth')
@UseGuards(JwtAuthGuard)
export class BandwidthController {
  private readonly logger = new Logger(BandwidthController.name);

  constructor(private readonly bandwidthService: BandwidthService) {}

  @Get('realtime')
  @ApiOperation({ summary: 'Utilisation en temps réel', description: 'Retourne l\'utilisation de bande passante en temps réel' })
  @ApiResponse({ status: 200, description: 'Données récupérées avec succès' })
  async getRealTimeUsage() {
    this.logger.log('GET /bandwidth/realtime');
    return await this.bandwidthService.getRealTimeUsage();
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques de bande passante', description: 'Retourne les statistiques globales de bande passante' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées avec succès' })
  async getBandwidthStats() {
    this.logger.log('GET /bandwidth/stats');
    return await this.bandwidthService.getBandwidthStats();
  }

  @Get('user/:username')
  @ApiOperation({ summary: 'Bande passante par utilisateur', description: 'Retourne l\'utilisation de bande passante pour un utilisateur spécifique' })
  @ApiParam({ name: 'username', description: 'Nom d\'utilisateur Wi-Fi' })
  @ApiResponse({ status: 200, description: 'Données récupérées avec succès' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async getUserBandwidth(@Param('username') username: string) {
    this.logger.log(`GET /bandwidth/user/${username}`);
    return await this.bandwidthService.getUserBandwidth(username);
  }

  @Get('history')
  @ApiOperation({ summary: 'Historique de bande passante', description: 'Retourne l\'historique d\'utilisation de bande passante' })
  @ApiQuery({ name: 'days', required: false, description: 'Nombre de jours (défaut: 7)', example: 30 })
  @ApiResponse({ status: 200, description: 'Historique récupéré avec succès' })
  async getHistoricalUsage(@Query('days') days?: string) {
    this.logger.log(`GET /bandwidth/history days=${days ?? '7'}`);
    const daysNumber = days ? parseInt(days) : 7;
    return await this.bandwidthService.getHistoricalUsage(daysNumber);
  }
}
