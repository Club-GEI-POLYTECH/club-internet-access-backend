import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../entities/user.entity';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    default: 10,
    minimum: 0,
    maximum: 50,
    description:
      'Nombre max de paiements récents par utilisateur (0 = aucun paiement dans la réponse). Tri : plus récent d’abord.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50)
  paymentsLimit?: number = 10;

  @ApiPropertyOptional({ enum: UserRole, description: 'Filtrer par rôle' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Recherche partielle sur email, prénom ou nom' })
  @IsOptional()
  @IsString()
  search?: string;
}
