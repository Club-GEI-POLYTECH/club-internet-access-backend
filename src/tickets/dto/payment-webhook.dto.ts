import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsEnum, IsString, IsOptional } from 'class-validator';
import { PaymentStatus } from '../../entities/payment.entity';

export class PaymentWebhookDto {
  @ApiProperty({
    description: 'ID du paiement',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  paymentId: string;

  @ApiProperty({
    description: 'Nouveau statut du paiement',
    enum: PaymentStatus,
    example: PaymentStatus.COMPLETED,
  })
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @ApiPropertyOptional({
    description: 'ID de transaction (optionnel)',
    example: 'MTN123456',
  })
  @IsOptional()
  @IsString()
  transactionId?: string;
}
