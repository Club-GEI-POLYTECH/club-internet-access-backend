import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Payment } from './payment.entity';
import { Session } from './session.entity';

export enum DurationType {
  HOURS_24 = '24h',
  HOURS_48 = '48h',
  DAYS_7 = '7d',
  DAYS_30 = '30d',
  UNLIMITED = 'unlimited',
}

export enum BandwidthProfile {
  BASIC_1MB = '1mbps',
  STANDARD_2MB = '2mbps',
  PREMIUM_5MB = '5mbps',
}

@Entity('wifi_accounts')
export class WiFiAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: DurationType,
    default: DurationType.HOURS_24,
  })
  duration: DurationType;

  @Column({
    type: 'enum',
    enum: BandwidthProfile,
    default: BandwidthProfile.STANDARD_2MB,
  })
  bandwidthProfile: BandwidthProfile;

  @Column({ default: 1 })
  maxDevices: number;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isExpired: boolean;

  @Column({ nullable: true })
  mikrotikUserId: string;

  @Column({ nullable: true })
  comment: string;

  @ManyToOne(() => User, (user) => user.wifiAccounts, { nullable: true })
  @JoinColumn({ name: 'createdBy' })
  createdBy: User;

  @Column({ nullable: true })
  createdById: string;

  @OneToMany(() => Payment, (payment) => payment.wifiAccount)
  payments: Payment[];

  @OneToMany(() => Session, (session) => session.wifiAccount)
  sessions: Session[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

