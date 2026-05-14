import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MinLength, IsOptional, Matches } from 'class-validator';
import { UserRole } from '../../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'agent@example.org' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'MotDePasseSecurise1!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Jean' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Dupont' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ example: '+243900000000' })
  @IsOptional()
  @Matches(/^(\+243|0)[0-9]{9}$/, {
    message: 'Le numéro doit être au format congolais (+243900000000 ou 0900000000)',
  })
  phone?: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.AGENT })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
