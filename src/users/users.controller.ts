import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../entities/user.entity';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Lister tous les utilisateurs', description: 'Retourne la liste de tous les utilisateurs du système' })
  @ApiResponse({ status: 200, description: 'Liste récupérée avec succès' })
  async findAll() {
    return await this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtenir un utilisateur', description: 'Récupère les détails d\'un utilisateur spécifique' })
  @ApiParam({ name: 'id', description: 'UUID de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Utilisateur récupéré avec succès' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async findOne(@Param('id') id: string) {
    return await this.usersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un utilisateur', description: 'Crée un nouvel utilisateur dans le système' })
  @ApiBody({ schema: { type: 'object', example: { email: 'user@example.com', password: 'password123', firstName: 'John', lastName: 'Doe', role: 'agent' } } })
  @ApiResponse({ status: 201, description: 'Utilisateur créé avec succès' })
  @ApiResponse({ status: 400, description: 'Erreur de validation' })
  async create(@Body() userData: Partial<User>) {
    return await this.usersService.create(userData);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Mettre à jour un utilisateur', description: 'Met à jour les informations d\'un utilisateur' })
  @ApiParam({ name: 'id', description: 'UUID de l\'utilisateur' })
  @ApiBody({ schema: { type: 'object', example: { firstName: 'John Updated', phone: '+243999999999' } } })
  @ApiResponse({ status: 200, description: 'Utilisateur mis à jour avec succès' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async update(@Param('id') id: string, @Body() userData: Partial<User>) {
    return await this.usersService.update(id, userData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un utilisateur', description: 'Supprime un utilisateur du système' })
  @ApiParam({ name: 'id', description: 'UUID de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Utilisateur supprimé avec succès' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return { message: 'User deleted successfully' };
  }
}
