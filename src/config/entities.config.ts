import { User } from '../entities/user.entity';
import { Payment } from '../entities/payment.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';
import { PendingRegistration } from '../entities/pending-registration.entity';
import { Ticket } from '../entities/ticket.entity';
import { TicketType } from '../entities/ticket-type.entity';

export const entities = [
  User,
  Payment,
  PasswordResetToken,
  PendingRegistration,
  Ticket,
  TicketType,
];
