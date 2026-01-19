import { IsEnum, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DurationType, BandwidthProfile } from '../../entities/wifi-account.entity';

export class CreateWiFiAccountDto {
  @ApiPropertyOptional({ example: 'etu9832', description: 'Nom d\'utilisateur (généré automatiquement si non fourni)' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ enum: DurationType, example: DurationType.HOURS_24, description: 'Durée de validité du compte' })
  @IsEnum(DurationType)
  duration: DurationType;

  @ApiProperty({ enum: BandwidthProfile, example: BandwidthProfile.STANDARD_2MB, description: 'Profil de débit' })
  @IsEnum(BandwidthProfile)
  bandwidthProfile: BandwidthProfile;

  @ApiPropertyOptional({ example: 1, description: 'Nombre maximum d\'appareils autorisés', minimum: 1, maximum: 10, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxDevices?: number;

  @ApiPropertyOptional({ example: 'Compte étudiant', description: 'Commentaire optionnel' })
  @IsOptional()
  @IsString()
  comment?: string;
}

