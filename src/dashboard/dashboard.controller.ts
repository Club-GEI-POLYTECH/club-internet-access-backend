import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('my-stats')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mes statistiques', description: 'Comptes Wi-Fi et paiements de l\'utilisateur connecté (tous rôles: Admin, Agent, Étudiant)' })
  @ApiResponse({ status: 200, description: 'wifiAccountsCount, paymentsCount' })
  async getMyStats(@Request() req: { user: { userId: string } }) {
    return await this.dashboardService.getMyStats(req.user.userId);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Statistiques globales du dashboard', description: 'Statistiques globales (comptes, paiements, sessions, tickets) - ADMIN/AGENT uniquement' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées avec succès' })
  async getStats() {
    return await this.dashboardService.getDashboardStats();
  }

  @Get('charts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({ summary: 'Données pour graphiques', description: 'Données pour graphiques du dashboard - ADMIN/AGENT uniquement' })
  @ApiQuery({ name: 'days', required: false, description: 'Nombre de jours (défaut: 7)', example: 30 })
  @ApiResponse({ status: 200, description: 'Données récupérées avec succès' })
  async getCharts(@Query('days') days?: string) {
    const daysNumber = days ? parseInt(days) : 7;
    return await this.dashboardService.getChartData(daysNumber);
  }
}
