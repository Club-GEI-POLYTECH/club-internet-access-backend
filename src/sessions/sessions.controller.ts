import { Controller, Get, Param, Post, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@ApiTags('Sessions')
@ApiBearerAuth('JWT-auth')
@Controller('sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SessionsController {
  private readonly logger = new Logger(SessionsController.name);

  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Lister toutes les sessions', description: 'Retourne la liste de toutes les sessions (ADMIN/AGENT uniquement)' })
  @ApiResponse({ status: 200, description: 'Liste des sessions récupérée avec succès' })
  @ApiResponse({ status: 403, description: 'Accès refusé (rôle insuffisant)' })
  async findAll() {
    this.logger.log('GET /sessions');
    return await this.sessionsService.findAll();
  }

  @Get('active')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Lister les sessions actives', description: 'Retourne uniquement les sessions actives (ADMIN/AGENT uniquement)' })
  @ApiResponse({ status: 200, description: 'Liste des sessions actives récupérée avec succès' })
  async findActive() {
    this.logger.log('GET /sessions/active');
    return await this.sessionsService.findActive();
  }

  @Get('statistics')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Statistiques des sessions', description: 'Retourne les statistiques des sessions (ADMIN/AGENT uniquement)' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées avec succès' })
  async getStatistics() {
    this.logger.log('GET /sessions/statistics');
    return await this.sessionsService.getStatistics();
  }

  @Post('sync')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Synchroniser les sessions', description: 'Synchronise les sessions avec MikroTik (ADMIN uniquement)' })
  @ApiResponse({ status: 200, description: 'Sessions synchronisées avec succès' })
  @ApiResponse({ status: 403, description: 'Accès refusé (ADMIN uniquement)' })
  async syncSessions() {
    this.logger.log('POST /sessions/sync');
    const count = await this.sessionsService.syncActiveSessions();
    return { message: `Synced ${count} active session(s)` };
  }

  @Get('wifi-account/:wifiAccountId')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Sessions d\'un compte Wi-Fi', description: 'Retourne toutes les sessions d\'un compte Wi-Fi spécifique' })
  @ApiParam({ name: 'wifiAccountId', description: 'UUID du compte Wi-Fi' })
  @ApiResponse({ status: 200, description: 'Sessions récupérées avec succès' })
  async findByWiFiAccount(@Param('wifiAccountId') wifiAccountId: string) {
    this.logger.log(`GET /sessions/wifi-account/${wifiAccountId}`);
    return await this.sessionsService.findByWiFiAccount(wifiAccountId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Obtenir une session', description: 'Récupère les détails d\'une session spécifique' })
  @ApiParam({ name: 'id', description: 'UUID de la session' })
  @ApiResponse({ status: 200, description: 'Session récupérée avec succès' })
  @ApiResponse({ status: 404, description: 'Session non trouvée' })
  async findOne(@Param('id') id: string) {
    this.logger.log(`GET /sessions/${id}`);
    return await this.sessionsService.findOne(id);
  }
}
