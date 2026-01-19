import { User } from '../entities/user.entity';
import { WiFiAccount } from '../entities/wifi-account.entity';
import { Payment } from '../entities/payment.entity';
import { Session } from '../entities/session.entity';
import { PasswordResetToken } from '../entities/password-reset-token.entity';

export const entities = [
  User,
  WiFiAccount,
  Payment,
  Session,
  PasswordResetToken,
];
