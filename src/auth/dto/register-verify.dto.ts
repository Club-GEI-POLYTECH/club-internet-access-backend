import { IsEmail, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Étape 2 : vérification du code reçu par email puis création du compte. */
export class RegisterVerifyDto {
  @ApiProperty({ example: 'etudiant@student.unikin.cd' })
  @IsEmail({}, { message: 'Adresse email invalide' })
  email: string;

  @ApiProperty({ example: '123456', description: 'Code à 6 chiffres reçu par email' })
  @IsString()
  @Length(6, 6, { message: 'Le code doit contenir exactement 6 chiffres' })
  @Matches(/^\d{6}$/, { message: 'Le code doit être composé de 6 chiffres' })
  code: string;
}
