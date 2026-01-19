import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../entities/user.entity';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email de l\'utilisateur' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Mot de passe (minimum 6 caractères)', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'John', description: 'Prénom de l\'utilisateur' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Nom de famille de l\'utilisateur' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ example: '+243900000000', description: 'Numéro de téléphone (optionnel)' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.AGENT, description: 'Rôle de l\'utilisateur', default: UserRole.AGENT })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

