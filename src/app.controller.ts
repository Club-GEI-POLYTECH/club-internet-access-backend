import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('App')
@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Endpoint racine', description: 'Retourne un message de bienvenue' })
  @ApiResponse({ status: 200, description: 'Message de bienvenue', schema: { type: 'string', example: 'Hello World!' } })
  getHello(): string {
    this.logger.log('GET /');
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check', description: 'Vérifie l\'état de santé de l\'API' })
  @ApiResponse({
    status: 200,
    description: 'État de santé de l\'API',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2024-01-15T10:30:00.000Z' },
        service: { type: 'string', example: 'Internet Access Management API' },
      },
    },
  })
  health() {
    this.logger.log('GET /health');
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Internet Access Management API',
    };
  }
}

