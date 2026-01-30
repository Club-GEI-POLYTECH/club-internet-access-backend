import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
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
  constructor(private readonly ticketsService: TicketsService) {}

  @Post('import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Importe des tickets depuis un fichier CSV (Admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Fichier CSV avec les tickets',
        },
        defaultPrice: {
          type: 'number',
          description: 'Prix par défaut pour les tickets sans type',
          example: 5000,
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
      }),
    )
    file: { buffer: Buffer },
    @Body() importDto?: ImportTicketsDto,
  ) {
    const csvContent = file.buffer.toString('utf-8');
    return await this.ticketsService.importFromCSV(csvContent, importDto?.defaultPrice);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Statistiques sur les tickets (Admin)' })
  @ApiResponse({ status: 200, description: 'Statistiques des tickets' })
  async getStats() {
    return await this.ticketsService.getStats();
  }

  @Put(':id/price')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifie le prix d\'un ticket (Admin)' })
  @ApiResponse({ status: 200, description: 'Prix modifié' })
  @ApiResponse({ status: 404, description: 'Ticket non trouvé' })
  async updatePrice(@Param('id') id: string, @Body('price') price: number) {
    const ticket = await this.ticketsService.updatePrice(id, price);
    return {
      ...ticket,
      password: '***',
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprime un ticket (Admin)' })
  @ApiResponse({ status: 200, description: 'Ticket supprimé' })
  @ApiResponse({ status: 404, description: 'Ticket non trouvé' })
  async remove(@Param('id') id: string) {
    await this.ticketsService.remove(id);
    return { message: 'Ticket deleted successfully' };
  }
}
