import { SelectQueryBuilder } from 'typeorm';
import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { PaymentMethod, PaymentStatus } from '../entities/payment.entity';

/**
 * Filtre catalogue : tickets `AVAILABLE` sans paiement Kelpay encore ouvert (PENDING/PROCESSING)
 * sur la même ligne (initiate sans passage en RESERVED).
 */
export function andCatalogAvailableForTicket(
  qb: SelectQueryBuilder<Ticket>,
  ticketAlias = 'ticket',
): SelectQueryBuilder<Ticket> {
  return qb
    .andWhere(`${ticketAlias}.status = :_avail`, { _avail: TicketStatus.AVAILABLE })
    .andWhere(
      `NOT EXISTS (
        SELECT 1 FROM payments p
        WHERE p."ticketId" IS NOT NULL
        AND p."ticketId" = ${ticketAlias}.id
        AND p.method = :_kelpayMm
        AND p.status IN (:..._kelpayOpen)
      )`,
      {
        _kelpayMm: PaymentMethod.MOBILE_MONEY,
        _kelpayOpen: [PaymentStatus.PENDING, PaymentStatus.PROCESSING],
      },
    );
}
