import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { MikroTikService, HotspotUser } from './mikrotik.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('mikrotik')
@UseGuards(JwtAuthGuard)
export class MikroTikController {
  constructor(private readonly mikrotikService: MikroTikService) {}

  @Get('status')
  async getStatus() {
    const connected = await this.mikrotikService.checkConnection();
    return { connected };
  }

  @Post('users')
  async createUser(@Body() userData: HotspotUser) {
    return await this.mikrotikService.createHotspotUser(userData);
  }

  @Get('users')
  async listUsers() {
    return await this.mikrotikService.listHotspotUsers();
  }

  @Get('users/:username')
  async getUser(@Param('username') username: string) {
    return await this.mikrotikService.getHotspotUser(username);
  }

  @Delete('users/:username')
  async deleteUser(@Param('username') username: string) {
    await this.mikrotikService.deleteHotspotUser(username);
    return { message: `User ${username} deleted successfully` };
  }

  @Get('active')
  async getActiveUsers() {
    return await this.mikrotikService.getActiveUsers();
  }

  @Delete('active/:sessionId')
  async disconnectUser(@Param('sessionId') sessionId: string) {
    await this.mikrotikService.disconnectUser(sessionId);
    return { message: 'User disconnected successfully' };
  }

  @Post('users/:username/disable')
  async disableUser(@Param('username') username: string) {
    await this.mikrotikService.disableUser(username);
    return { message: `User ${username} disabled successfully` };
  }

  @Post('users/:username/enable')
  async enableUser(@Param('username') username: string) {
    await this.mikrotikService.enableUser(username);
    return { message: `User ${username} enabled successfully` };
  }
}

