import { User, UserRole } from '../entities/user.entity';
import { Payment, PaymentMethod, PaymentStatus } from '../entities/payment.entity';

/** Paiement allégé pour la liste admin (sans `providerResponse`). */
export interface UserListPaymentItem {
  id: string;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  transactionId?: string;
  merchantReference?: string;
  phoneNumber?: string;
  ticketId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  payments: UserListPaymentItem[];
  /** Nombre total de paiements de l’utilisateur (toutes pages). */
  paymentsTotal: number;
}

export function toUserListPaymentItem(payment: Payment): UserListPaymentItem {
  const amount =
    typeof payment.amount === 'number'
      ? payment.amount
      : parseFloat(String(payment.amount ?? '')) || 0;

  return {
    id: payment.id,
    amount,
    status: payment.status,
    method: payment.method,
    transactionId: payment.transactionId ?? undefined,
    merchantReference: payment.merchantReference ?? undefined,
    phoneNumber: payment.phoneNumber ?? undefined,
    ticketId: payment.ticketId ?? undefined,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

export function toUserListItem(user: User, payments: Payment[], paymentsTotal: number): UserListItem {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone ?? undefined,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    payments: payments.map(toUserListPaymentItem),
    paymentsTotal,
  };
}
