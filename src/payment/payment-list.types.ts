import { Payment, PaymentMethod, PaymentStatus } from '../entities/payment.entity';

export interface PaymentListTicketSummary {
  id: string;
  username: string;
  status: string;
  profile: string;
}

export interface PaymentListCreatedBySummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface PaymentListItem {
  id: string;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  transactionId?: string;
  merchantReference?: string;
  phoneNumber?: string;
  ticketId?: string;
  createdById?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  ticket?: PaymentListTicketSummary;
  createdBy?: PaymentListCreatedBySummary;
}

function normalizeAmount(value: unknown): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : 0;
}

export function toPaymentListItem(payment: Payment): PaymentListItem {
  const item: PaymentListItem = {
    id: payment.id,
    amount: normalizeAmount(payment.amount),
    status: payment.status,
    method: payment.method,
    transactionId: payment.transactionId ?? undefined,
    merchantReference: payment.merchantReference ?? undefined,
    phoneNumber: payment.phoneNumber ?? undefined,
    ticketId: payment.ticketId ?? undefined,
    createdById: payment.createdById ?? undefined,
    notes: payment.notes ?? undefined,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };

  if (payment.ticket) {
    item.ticket = {
      id: payment.ticket.id,
      username: payment.ticket.username,
      status: payment.ticket.status,
      profile: payment.ticket.profile,
    };
  }

  if (payment.createdBy) {
    item.createdBy = {
      id: payment.createdBy.id,
      email: payment.createdBy.email,
      firstName: payment.createdBy.firstName,
      lastName: payment.createdBy.lastName,
      role: payment.createdBy.role,
    };
  }

  return item;
}
