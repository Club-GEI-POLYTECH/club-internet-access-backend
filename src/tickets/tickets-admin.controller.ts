import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { ImportTicketsDto } from './dto/import-tickets.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';

/**
 * Contrôleur admin des tickets : préfixe /api/admin/tickets
 * Expose les mêmes endpoints que TicketsController (admin/*) pour accepter
 * les appels frontend vers /api/admin/tickets/import, etc.
 */
@ApiTags('Tickets (Admin)')
@Controller('admin/tickets')
export class TicketsAdminController {
  private readonly logger = new Logger(TicketsAdminController.name);

  constructor(private readonly ticketsService: TicketsService) {}

  @Post('import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Importe des tickets depuis un fichier CSV (Admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV Mikhmon — prix selon Time Limit (24h / 7d / 30d), variables TICKET_PRICE_*',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiResponse({ status: 201, description: 'Tickets importés avec succès' })
  @ApiResponse({ status: 400, description: 'Fichier invalide' })
  @ApiResponse({ status: 401, description: 'Non autorisé' })
  async importTickets(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
        ],
        fileIsRequired: true,
      }),
    )
    file: any,
    @Body() _importDto?: ImportTicketsDto,
  ) {
    this.logger.log(
      `POST /admin/tickets/import filename=${file?.originalname} mimetype=${file?.mimetype} size=${file?.size}`,
    );
    const csvContent = file.buffer.toString('utf-8');
    return await this.ticketsService.importFromCSV(csvContent);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Statistiques sur les tickets (Admin)' })
  @ApiResponse({ status: 200, description: 'Statistiques des tickets' })
  async getStats() {
    this.logger.log('GET /admin/tickets/stats');
    return await this.ticketsService.getStats();
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Supprime un ticket (Admin)' })
  @ApiResponse({ status: 200, description: 'Ticket supprimé' })
  @ApiResponse({ status: 404, description: 'Ticket non trouvé' })
  async remove(@Param('id') id: string) {
    this.logger.log(`DELETE /admin/tickets/${id}`);
    await this.ticketsService.remove(id);
    return { message: 'Ticket deleted successfully' };
  }
}
