import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { AuthEntity } from '@infrastructure/entities/auth.entity';
import { FinancialAccountEntity } from '@infrastructure/entities/financial-account.entity';

@Entity('profiles')
export class ProfileEntity {
  @PrimaryColumn()
  id: string;

  @Column({ unique: true })
  authId: string;

  @OneToOne(() => AuthEntity, auth => auth.profile)
  @JoinColumn({ name: 'authId' })
  auth: AuthEntity;

  @Column()
  name: string;

  @Column()
  lastname: string;

  @Column({ nullable: true })
  age?: number;

  @Column({ nullable: true })
  phoneNumber?: string;

  @Column({ nullable: true })
  dateOfBirth?: Date;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  state?: string;

  @Column({ nullable: true })
  zipCode?: string;

  @Column({ nullable: true })
  country?: string;

  @Column({ default: 'USD' })
  preferredCurrency: string;

  @OneToMany(() => FinancialAccountEntity, account => account.profile)
  financialAccounts: FinancialAccountEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 