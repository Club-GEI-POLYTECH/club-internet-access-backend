import { Controller, Get, Query, UseGuards, Request, Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

  @Get('my-stats')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Mes statistiques',
    description: 'Nombre de paiements liés au compte connecté (utile pour suivi interne)',
  })
  @ApiResponse({ status: 200, description: '{ paymentsCount }' })
  async getMyStats(@Request() req: { user: { userId: string } }) {
    this.logger.log(`GET /dashboard/my-stats userId=${req.user.userId}`);
    return await this.dashboardService.getMyStats(req.user.userId);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({
    summary: 'Statistiques vente de tickets',
    description: 'Paiements, tickets (stock / vendus), utilisateurs — ADMIN/AGENT',
  })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées avec succès' })
  async getStats() {
    this.logger.log('GET /dashboard/stats');
    return await this.dashboardService.getDashboardStats();
  }

  @Get('charts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @ApiOperation({
    summary: 'Graphiques (tickets & paiements)',
    description: 'Séries temporelles : paiements complétés et tickets vendus — ADMIN/AGENT',
  })
  @ApiQuery({ name: 'days', required: false, description: 'Nombre de jours (défaut: 7)', example: 30 })
  @ApiResponse({ status: 200, description: 'Données récupérées avec succès' })
  async getCharts(@Query('days') days?: string) {
    this.logger.log(`GET /dashboard/charts days=${days ?? '7'}`);
    const daysNumber = days ? parseInt(days, 10) : 7;
    return await this.dashboardService.getChartData(daysNumber);
  }
}
