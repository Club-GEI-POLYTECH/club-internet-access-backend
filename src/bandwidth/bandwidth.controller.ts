import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { BandwidthService } from './bandwidth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('bandwidth')
@UseGuards(JwtAuthGuard)
export class BandwidthController {
  constructor(private readonly bandwidthService: BandwidthService) {}

  @Get('realtime')
  async getRealTimeUsage() {
    return await this.bandwidthService.getRealTimeUsage();
  }

  @Get('stats')
  async getBandwidthStats() {
    return await this.bandwidthService.getBandwidthStats();
  }

  @Get('user/:username')
  async getUserBandwidth(@Param('username') username: string) {
    return await this.bandwidthService.getUserBandwidth(username);
  }

  @Get('history')
  async getHistoricalUsage(@Query('days') days?: string) {
    const daysNumber = days ? parseInt(days) : 7;
    return await this.bandwidthService.getHistoricalUsage(daysNumber);
  }
}

