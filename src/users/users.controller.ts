import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';

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
    summary: 'Lister les utilisateurs (paginé)',
    description:
      'Admin uniquement. Réponse `{ data, meta }` : pagination utilisateurs + au plus `paymentsLimit` paiements récents par compte (sans `providerResponse`). Détail complet : `GET /users/:id`.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'paymentsLimit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'role', required: false, enum: ['admin', 'agent', 'student'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Page récupérée avec succès' })
  @ApiResponse({ status: 403, description: 'Rôle insuffisant' })
  async findAll(@Query() query: ListUsersQueryDto) {
    this.logger.log(`GET /users page=${query.page ?? 1} limit=${query.limit ?? 20}`);
    return await this.usersService.findAllPaginated(query);
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
