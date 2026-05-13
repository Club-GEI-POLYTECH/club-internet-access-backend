import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

/** Durée catalogue (liée à `ticket_types` DURATION_24H / DURATION_7J / DURATION_30J). */
export const IMPORT_CATALOG_DURATION_VALUES = ['24h', '7j', '30j'] as const;
export type ImportCatalogDuration = (typeof IMPORT_CATALOG_DURATION_VALUES)[number];

/**
 * Champs multipart en plus du fichier `file` (camelCase, comme Multer / Nest).
 *
 * **Type catalogue** : uniquement `ticketTypeId` **ou** `catalogDuration`. Les colonnes CSV
 * « Time Limit » / « Data Limit » ne servent **jamais** à choisir le type ni à remplir ces champs sur le ticket :
 * ce sont toujours les valeurs du `TicketType` lié.
 */
export class ImportTicketsDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'UUID du `TicketType` (`GET /tickets/types`). Tous les tickets importés sont liés à ce type. ' +
      'Prioritaire sur `catalogDuration`.',
  })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value == null ? undefined : String(value).trim()))
  @IsUUID('4')
  ticketTypeId?: string;

  @ApiPropertyOptional({
    enum: IMPORT_CATALOG_DURATION_VALUES,
    description:
      'Sans `ticketTypeId` : durée catalogue pour tout le fichier (24h / 7j / 30j). ' +
      'Obligatoire si `ticketTypeId` est absent. Ignoré si `ticketTypeId` est présent. ' +
      'Les colonnes CSV Time Limit / Data Limit ne sont pas utilisées pour le type.',
  })
  @IsOptional()
  @IsIn([...IMPORT_CATALOG_DURATION_VALUES])
  catalogDuration?: ImportCatalogDuration;
}
