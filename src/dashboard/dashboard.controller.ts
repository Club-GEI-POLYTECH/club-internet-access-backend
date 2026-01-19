import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.AGENT)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques du dashboard', description: 'Retourne les statistiques globales du dashboard (ADMIN/AGENT uniquement)' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées avec succès' })
  async getStats() {
    return await this.dashboardService.getDashboardStats();
  }

  @Get('charts')
  @ApiOperation({ summary: 'Données pour graphiques', description: 'Retourne les données pour les graphiques du dashboard' })
  @ApiQuery({ name: 'days', required: false, description: 'Nombre de jours (défaut: 7)', example: 30 })
  @ApiResponse({ status: 200, description: 'Données récupérées avec succès' })
  async getCharts(@Query('days') days?: string) {
    const daysNumber = days ? parseInt(days) : 7;
    return await this.dashboardService.getChartData(daysNumber);
  }
}
