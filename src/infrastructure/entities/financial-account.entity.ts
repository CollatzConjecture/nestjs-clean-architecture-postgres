import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { ProfileEntity } from '@infrastructure/entities/profile.entity';
import { TransactionEntity } from '@infrastructure/entities/transaction.entity';

@Entity('financial_accounts')
export class FinancialAccountEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  profileId: string;

  @ManyToOne(() => ProfileEntity, profile => profile.financialAccounts)
  @JoinColumn({ name: 'profileId' })
  profile: ProfileEntity;

  @Column({ nullable: true })
  plaidAccountId?: string;

  @Column({ nullable: true })
  finverseAccountId?: string;

  @Column()
  institutionId: string;

  @Column()
  institutionName: string;

  @Column()
  accountType: string;

  @Column()
  accountSubtype: string;

  @Column()
  accountName: string;

  @Column({ nullable: true })
  officialName?: string;

  @Column({ nullable: true })
  mask?: string;

  @Column('decimal', { precision: 12, scale: 2 })
  currentBalance: number;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  availableBalance?: number;

  @Column({ length: 3 })
  currency: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastSyncAt?: Date;

  @Column({ nullable: true })
  lastTransactionDate?: Date;

  @Column('jsonb', { nullable: true })
  rawData?: Record<string, any>;

  @OneToMany(() => TransactionEntity, transaction => transaction.account)
  transactions: TransactionEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 