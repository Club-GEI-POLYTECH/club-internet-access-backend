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
import { WiFiAccountsService } from './wifi-accounts.service';
import { CreateWiFiAccountDto } from './dto/create-wifi-account.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('wifi-accounts')
@UseGuards(JwtAuthGuard)
export class WiFiAccountsController {
  constructor(private readonly wifiAccountsService: WiFiAccountsService) {}

  @Post()
  async create(@Body() createDto: CreateWiFiAccountDto, @Request() req) {
    return await this.wifiAccountsService.create(createDto, req.user.userId);
  }

  @Get()
  async findAll() {
    return await this.wifiAccountsService.findAll();
  }

  @Get('active')
  async getActive() {
    return await this.wifiAccountsService.getActiveAccounts();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.wifiAccountsService.findOne(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.wifiAccountsService.delete(id);
    return { message: 'WiFi account deleted successfully' };
  }
}

