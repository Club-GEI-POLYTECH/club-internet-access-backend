import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min } from 'class-validator';

export class ImportTicketsDto {
  @ApiProperty({
    description: 'Prix par défaut pour les tickets sans type',
    example: 5000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultPrice?: number;
}
