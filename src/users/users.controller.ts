import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({
    summary: 'Lister tous les utilisateurs',
    description: 'Admin uniquement. Les mots de passe ne sont jamais renvoyés.',
  })
  @ApiResponse({ status: 200, description: 'Liste récupérée avec succès' })
  @ApiResponse({ status: 403, description: 'Rôle insuffisant' })
  async findAll() {
    this.logger.log('GET /users');
    return await this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtenir un utilisateur',
    description: 'Admin uniquement.',
  })
  @ApiParam({ name: 'id', description: 'UUID de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Utilisateur récupéré avec succès' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async findOne(@Param('id') id: string) {
    this.logger.log(`GET /users/${id}`);
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    return user;
  }

  @Post()
  @ApiOperation({
    summary: 'Créer un utilisateur',
    description: 'Admin uniquement (agent ou admin selon le corps).',
  })
  @ApiResponse({ status: 201, description: 'Utilisateur créé avec succès' })
  @ApiResponse({ status: 400, description: 'Erreur de validation' })
  @ApiResponse({ status: 403, description: 'Rôle insuffisant' })
  async create(@Body() dto: CreateUserDto) {
    this.logger.log(`POST /users email=${dto?.email}`);
    return await this.usersService.create(dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Mettre à jour un utilisateur',
    description: 'Admin uniquement — champs autorisés uniquement (pas de mass assignment arbitraire).',
  })
  @ApiParam({ name: 'id', description: 'UUID de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Utilisateur mis à jour avec succès' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    this.logger.log(`PUT /users/${id}`);
    const existing = await this.usersService.findOne(id);
    if (!existing) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    return await this.usersService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un utilisateur', description: 'Admin uniquement' })
  @ApiParam({ name: 'id', description: 'UUID de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Utilisateur supprimé avec succès' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async remove(@Param('id') id: string) {
    this.logger.log(`DELETE /users/${id}`);
    const existing = await this.usersService.findOne(id);
    if (!existing) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    await this.usersService.remove(id);
    return { message: 'User deleted successfully' };
  }
}
