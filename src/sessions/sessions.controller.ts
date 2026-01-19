import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  async findAll() {
    return await this.sessionsService.findAll();
  }

  @Get('active')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  async findActive() {
    return await this.sessionsService.findActive();
  }

  @Get('statistics')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  async getStatistics() {
    return await this.sessionsService.getStatistics();
  }

  @Post('sync')
  @Roles(UserRole.ADMIN)
  async syncSessions() {
    const count = await this.sessionsService.syncActiveSessions();
    return { message: `Synced ${count} active session(s)` };
  }

  @Get('wifi-account/:wifiAccountId')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  async findByWiFiAccount(@Param('wifiAccountId') wifiAccountId: string) {
    return await this.sessionsService.findByWiFiAccount(wifiAccountId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  async findOne(@Param('id') id: string) {
    return await this.sessionsService.findOne(id);
  }
}

