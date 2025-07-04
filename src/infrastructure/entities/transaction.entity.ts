import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { FinancialAccountEntity } from './financial-account.entity';

@Entity('transactions')
@Index(['accountId', 'transactionDate']) // For efficient date-range queries
@Index(['merchantName']) // For merchant-based queries
@Index(['categoryPrimary']) // For category-based queries
export class TransactionEntity {
  @PrimaryColumn()
  id: string; // Plaid transaction_id or internal ID

  @Column()
  accountId: string;

  @ManyToOne(() => FinancialAccountEntity, account => account.transactions)
  @JoinColumn({ name: 'accountId' })
  account: FinancialAccountEntity;

  // Plaid/Finverse specific fields
  @Column({ nullable: true })
  plaidTransactionId?: string;

  @Column({ nullable: true })
  finverseTransactionId?: string;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column('date')
  transactionDate: Date;

  @Column('date', { nullable: true })
  authorizedDate?: Date;

  @Column()
  name: string; // Raw transaction name

  @Column({ nullable: true })
  merchantName?: string; // Cleaned merchant name

  @Column({ nullable: true })
  categoryPrimary?: string; // Primary category

  @Column('text', { array: true, nullable: true })
  categoryDetailed?: string[]; // Detailed category hierarchy

  @Column({ nullable: true })
  accountOwner?: string;

  @Column()
  transactionType: string; // place, digital, special, unresolved

  @Column({ default: false })
  pending: boolean;

  @Column({ nullable: true })
  pendingTransactionId?: string;

  @Column({ nullable: true })
  merchantCategoryCode?: string;

  // Location data
  @Column('jsonb', { nullable: true })
  location?: {
    address?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
    lat?: number;
    lon?: number;
  };

  // Payment meta
  @Column('jsonb', { nullable: true })
  paymentMeta?: {
    referenceNumber?: string;
    ppdId?: string;
    payee?: string;
    byOrderOf?: string;
    payer?: string;
    paymentMethod?: string;
    paymentProcessor?: string;
    reason?: string;
  };

  // Store raw API response for debugging/reference
  @Column('jsonb', { nullable: true })
  rawData?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 