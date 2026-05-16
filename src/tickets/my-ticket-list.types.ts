import { Ticket, TicketStatus } from '../entities/ticket.entity';
import { TicketType } from '../entities/ticket-type.entity';
import { Payment, PaymentMethod, PaymentStatus } from '../entities/payment.entity';

export interface MyTicketPaymentSummary {
  id: string;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  createdAt: Date;
}

export interface MyTicketListItem {
  id: string;
  username: string;
  password: string;
  profile: string;
  timeLimit?: string;
  dataLimit?: string;
  status: TicketStatus;
  soldAt?: Date;
  soldTo?: string;
  ticketTypeId?: string;
  ticketType?: Pick<TicketType, 'id' | 'name' | 'profile' | 'price' | 'timeLimit' | 'dataLimit'>;
  paymentId?: string;
  payment?: MyTicketPaymentSummary;
  createdAt: Date;
  updatedAt: Date;
}

function normalizeAmount(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : 0;
}

export async function toMyTicketListItem(
  ticket: Ticket,
  serializePassword: (t: Ticket) => Promise<string>,
): Promise<MyTicketListItem> {
  const password = await serializePassword(ticket);

  const item: MyTicketListItem = {
    id: ticket.id,
    username: ticket.username,
    password,
    profile: ticket.profile,
    timeLimit: ticket.timeLimit ?? undefined,
    dataLimit: ticket.dataLimit ?? undefined,
    status: ticket.status,
    soldAt: ticket.soldAt ?? undefined,
    soldTo: ticket.soldTo ?? undefined,
    ticketTypeId: ticket.ticketTypeId ?? undefined,
    paymentId: ticket.paymentId ?? undefined,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  };

  if (ticket.ticketType) {
    item.ticketType = {
      id: ticket.ticketType.id,
      name: ticket.ticketType.name,
      profile: ticket.ticketType.profile,
      price: normalizeAmount(ticket.ticketType.price),
      timeLimit: ticket.ticketType.timeLimit ?? undefined,
      dataLimit: ticket.ticketType.dataLimit ?? undefined,
    };
  }

  if (ticket.payment) {
    item.payment = {
      id: ticket.payment.id,
      amount: normalizeAmount(ticket.payment.amount),
      status: ticket.payment.status,
      method: ticket.payment.method,
      createdAt: ticket.payment.createdAt,
    };
  }

  return item;
}
