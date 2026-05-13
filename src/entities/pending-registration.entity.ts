import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/** Inscription en attente : créée après envoi du code email, supprimée après vérification réussie. */
@Entity('pending_registrations')
@Index(['email'], { unique: true })
export class PendingRegistration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  phone: string | null;

  /** Hash bcrypt du code à 6 chiffres (jamais en clair). */
  @Column()
  codeHash: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'int', default: 0 })
  verifyAttempts: number;

  @CreateDateColumn()
  createdAt: Date;
}
