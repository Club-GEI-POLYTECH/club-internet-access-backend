import { IsEnum, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { DurationType, BandwidthProfile } from '../../entities/wifi-account.entity';

export class CreateWiFiAccountDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsEnum(DurationType)
  duration: DurationType;

  @IsEnum(BandwidthProfile)
  bandwidthProfile: BandwidthProfile;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxDevices?: number;

  @IsOptional()
  @IsString()
  comment?: string;
}

