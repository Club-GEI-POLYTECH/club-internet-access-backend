import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsUUID, Min } from 'class-validator';

export class InitiateKelpayPaymentDto {
  @ApiProperty({ description: 'UUID du ticket à acheter' })
  @IsUUID()
  ticketId: string;

  @ApiProperty({ example: '+243900000000' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({
    description: 'Montant (CDF) — doit être strictement égal à ticket_types.price du type lié au ticket (ticket.ticketType.price)',
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Utilisateur acheteur (doit correspondre au JWT sauf admin)' })
  @IsUUID()
  userId: string;
}
