import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WiFiAccount } from './wifi-account.entity';
import { User } from './user.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  MOBILE_MONEY = 'mobile_money',
  CASH = 'cash',
  CARD = 'card',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  method: PaymentMethod;

  @Column({ nullable: true })
  transactionId: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @ManyToOne(() => WiFiAccount, (wifiAccount) => wifiAccount.payments, {
    nullable: true,
  })
  @JoinColumn({ name: 'wifiAccountId' })
  wifiAccount: WiFiAccount;

  @Column({ nullable: true })
  wifiAccountId: string;

  @ManyToOne(() => User, (user) => user.payments, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ nullable: true })
  createdById: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

