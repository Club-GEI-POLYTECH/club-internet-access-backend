import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Renvoyer un code à 6 chiffres pour une inscription déjà demandée. */
export class RegisterResendDto {
  @ApiProperty({ example: 'etudiant@student.unikin.cd' })
  @IsEmail({}, { message: 'Adresse email invalide' })
  email: string;
}
