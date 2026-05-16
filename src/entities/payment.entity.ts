import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Ticket } from './ticket.entity';

/** Statuts paiement — inclut le cycle KELPAY Mobile Money. */
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  MOBILE_MONEY = 'mobile_money',
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

  /** Identifiant transaction côté KELPAY (retourné après initiation). */
  @Column({ nullable: true })
  transactionId: string;

  /** Référence marchande unique envoyée à KELPAY (corrélation + idempotence). */
  @Index({ unique: true })
  @Column({ nullable: true })
  merchantReference: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  wifiAccountId: string;

  @ManyToOne(() => User, (user) => user.payments, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @Column({ type: 'uuid', nullable: true })
  createdById: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  /** Dernières réponses brutes (KELPAY init / polls / callback), JSON concaténé ou tableau sérialisé. */
  @Column({ type: 'text', nullable: true })
  providerResponse: string;

  /** Fin de traitement callback (idempotence). */
  @Column({ type: 'timestamp', nullable: true })
  callbackProcessedAt: Date;

  @OneToOne(() => Ticket, (ticket) => ticket.payment, { nullable: true })
  @JoinColumn({ name: 'ticketId', referencedColumnName: 'id' })
  ticket: Ticket;

  @Column({ type: 'uuid', nullable: true })
  ticketId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
