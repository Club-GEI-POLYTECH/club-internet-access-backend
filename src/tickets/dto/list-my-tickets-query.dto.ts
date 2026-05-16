import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TicketStatus } from '../../entities/ticket.entity';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListMyTicketsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TicketStatus, description: 'Filtrer par statut du ticket' })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;
}
