import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'reset-token-123456', description: 'Token de réinitialisation reçu par email' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'newPassword123', description: 'Nouveau mot de passe (minimum 6 caractères)', minLength: 6 })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

