import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Ticket } from './ticket.entity';

@Entity('ticket_types')
export class TicketType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  profile: string; // Profil MikroTik (ex: TEST, BASIC, PREMIUM)

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  timeLimit: string; // Format: "1d", "24h", null si illimité

  @Column({ nullable: true })
  dataLimit: string; // Format: "1GB", "500MB", null si illimité

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number; // Prix de vente en CDF

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Ticket, (ticket) => ticket.ticketType)
  tickets: Ticket[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
