import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { MikroTikService, HotspotUser } from './mikrotik.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('MikroTik')
@ApiBearerAuth('JWT-auth')
@Controller('mikrotik')
@UseGuards(JwtAuthGuard)
export class MikroTikController {
  constructor(private readonly mikrotikService: MikroTikService) {}

  @Get('status')
  @ApiOperation({ summary: 'Statut de connexion MikroTik', description: 'Vérifie le statut de connexion au routeur MikroTik' })
  @ApiResponse({ status: 200, description: 'Statut récupéré avec succès', schema: { type: 'object', properties: { connected: { type: 'boolean' } } } })
  async getStatus() {
    const connected = await this.mikrotikService.checkConnection();
    return { connected };
  }

  @Post('users')
  @ApiOperation({ summary: 'Créer un utilisateur MikroTik', description: 'Crée un utilisateur hotspot dans MikroTik' })
  @ApiBody({ schema: { type: 'object', example: { username: 'etu9832', password: 'X9fP2', profile: '2mbps' } } })
  @ApiResponse({ status: 201, description: 'Utilisateur créé avec succès' })
  async createUser(@Body() userData: HotspotUser) {
    return await this.mikrotikService.createHotspotUser(userData);
  }

  @Get('users')
  @ApiOperation({ summary: 'Lister les utilisateurs MikroTik', description: 'Retourne la liste de tous les utilisateurs hotspot dans MikroTik' })
  @ApiResponse({ status: 200, description: 'Liste récupérée avec succès' })
  async listUsers() {
    return await this.mikrotikService.listHotspotUsers();
  }

  @Get('users/:username')
  @ApiOperation({ summary: 'Obtenir un utilisateur MikroTik', description: 'Récupère les détails d\'un utilisateur hotspot dans MikroTik' })
  @ApiParam({ name: 'username', description: 'Nom d\'utilisateur MikroTik' })
  @ApiResponse({ status: 200, description: 'Utilisateur récupéré avec succès' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async getUser(@Param('username') username: string) {
    return await this.mikrotikService.getHotspotUser(username);
  }

  @Delete('users/:username')
  @ApiOperation({ summary: 'Supprimer un utilisateur MikroTik', description: 'Supprime un utilisateur hotspot dans MikroTik' })
  @ApiParam({ name: 'username', description: 'Nom d\'utilisateur MikroTik' })
  @ApiResponse({ status: 200, description: 'Utilisateur supprimé avec succès' })
  async deleteUser(@Param('username') username: string) {
    await this.mikrotikService.deleteHotspotUser(username);
    return { message: `User ${username} deleted successfully` };
  }

  @Get('active')
  @ApiOperation({ summary: 'Utilisateurs actifs MikroTik', description: 'Retourne la liste des utilisateurs actuellement connectés dans MikroTik' })
  @ApiResponse({ status: 200, description: 'Liste récupérée avec succès' })
  async getActiveUsers() {
    return await this.mikrotikService.getActiveUsers();
  }

  @Delete('active/:sessionId')
  @ApiOperation({ summary: 'Déconnecter un utilisateur', description: 'Déconnecte un utilisateur actif dans MikroTik' })
  @ApiParam({ name: 'sessionId', description: 'ID de session MikroTik' })
  @ApiResponse({ status: 200, description: 'Utilisateur déconnecté avec succès' })
  async disconnectUser(@Param('sessionId') sessionId: string) {
    await this.mikrotikService.disconnectUser(sessionId);
    return { message: 'User disconnected successfully' };
  }

  @Post('users/:username/disable')
  @ApiOperation({ summary: 'Désactiver un utilisateur', description: 'Désactive un utilisateur hotspot dans MikroTik' })
  @ApiParam({ name: 'username', description: 'Nom d\'utilisateur MikroTik' })
  @ApiResponse({ status: 200, description: 'Utilisateur désactivé avec succès' })
  async disableUser(@Param('username') username: string) {
    await this.mikrotikService.disableUser(username);
    return { message: `User ${username} disabled successfully` };
  }

  @Post('users/:username/enable')
  @ApiOperation({ summary: 'Activer un utilisateur', description: 'Active un utilisateur hotspot dans MikroTik' })
  @ApiParam({ name: 'username', description: 'Nom d\'utilisateur MikroTik' })
  @ApiResponse({ status: 200, description: 'Utilisateur activé avec succès' })
  async enableUser(@Param('username') username: string) {
    await this.mikrotikService.enableUser(username);
    return { message: `User ${username} enabled successfully` };
  }
}
