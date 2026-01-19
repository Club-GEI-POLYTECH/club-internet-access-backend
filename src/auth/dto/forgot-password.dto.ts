import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email pour la réinitialisation du mot de passe' })
  @IsEmail()
  email: string;
}

