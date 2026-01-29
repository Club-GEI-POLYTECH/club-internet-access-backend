import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { TicketType } from './ticket-type.entity';
import { Payment } from './payment.entity';

export enum TicketStatus {
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  SOLD = 'sold',
  EXPIRED = 'expired',
}

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string; // Nom d'utilisateur unique

  @Column()
  password: string; // Mot de passe (chiffré dans la DB)

  @Column()
  profile: string; // Profil MikroTik

  @Column({ nullable: true })
  timeLimit: string; // Format: "1d", "24h", null si illimité

  @Column({ nullable: true })
  dataLimit: string; // Format: "1GB", "500MB", null si illimité

  @Column({ type: 'text', nullable: true })
  comment: string; // Timestamp depuis Mikhmon

  @Column({
    type: 'enum',
    enum: TicketStatus,
    default: TicketStatus.AVAILABLE,
  })
  status: TicketStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number; // Prix de vente en CDF

  @Column({ type: 'timestamp', nullable: true })
  soldAt: Date; // Date de vente

  @Column({ nullable: true })
  soldTo: string; // Email ou téléphone de l'acheteur

  @ManyToOne(() => TicketType, (ticketType) => ticketType.tickets, {
    nullable: true,
  })
  @JoinColumn({ name: 'ticketTypeId' })
  ticketType: TicketType;

  @Column({ nullable: true })
  ticketTypeId: string;

  @OneToOne(() => Payment, (payment) => payment.ticket, { nullable: true })
  @JoinColumn({ name: 'paymentId' })
  payment: Payment;

  @Column({ nullable: true })
  paymentId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
