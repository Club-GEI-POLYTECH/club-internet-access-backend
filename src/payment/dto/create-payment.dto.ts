import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, PaymentStatus } from '../../entities/payment.entity';

export class CreatePaymentDto {
  @ApiProperty({ example: 1000, description: 'Montant du paiement', minimum: 0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.MOBILE_MONEY, description: 'Méthode de paiement' })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional({ example: 'MTN123456', description: 'ID de transaction (optionnel)' })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiPropertyOptional({ example: '+243900000000', description: 'Numéro de téléphone (optionnel)' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'uuid', description: 'UUID du compte Wi-Fi associé (optionnel)' })
  @IsOptional()
  @IsString()
  wifiAccountId?: string;

  @ApiPropertyOptional({ example: 'Paiement étudiant', description: 'Notes optionnelles' })
  @IsOptional()
  @IsString()
  notes?: string;
}

