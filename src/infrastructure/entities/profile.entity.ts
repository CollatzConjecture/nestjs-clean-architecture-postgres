import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { AuthEntity } from '@infrastructure/entities/auth.entity';

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

  @Column({ nullable: true })
  lastname?: string;

  @Column({ nullable: true })
  age?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 