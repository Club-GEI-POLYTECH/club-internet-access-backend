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

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => WiFiAccount, (wifiAccount) => wifiAccount.sessions)
  @JoinColumn({ name: 'wifiAccountId' })
  wifiAccount: WiFiAccount;

  @Column()
  wifiAccountId: string;

  @Column({ nullable: true })
  mikrotikSessionId: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  macAddress: string;

  @Column({ type: 'bigint', default: 0 })
  bytesIn: number;

  @Column({ type: 'bigint', default: 0 })
  bytesOut: number;

  @Column({ type: 'timestamp', nullable: true })
  connectedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  disconnectedAt: Date;

  @Column({ default: false })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

