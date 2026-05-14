import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsEnum, Matches } from 'class-validator';
import { PaymentMethod } from '../../entities/payment.entity';

export class PurchaseTicketDto {
  @ApiProperty({
    description: 'ID du ticket à acheter',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  ticketId: string;

  @ApiProperty({
    description: 'Numéro de téléphone de l\'acheteur',
    example: '+243900000000',
  })
  @IsString()
  @Matches(/^(\+243|0)[0-9]{9}$/, {
    message: 'Le numéro de téléphone doit être au format congolais (+243900000000 ou 0900000000)',
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'Méthode de paiement (`mobile_money` ou `card` — pas d’espèces)',
    enum: PaymentMethod,
    example: PaymentMethod.MOBILE_MONEY,
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;
}
