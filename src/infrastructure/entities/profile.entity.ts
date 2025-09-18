import { AuthEntity } from '@infrastructure/entities/auth.entity';
import { SoftDeletableEntity } from '@infrastructure/entities/base/soft-deletable.entity';
import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';

@Entity('profiles')
export class ProfileEntity extends SoftDeletableEntity {
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
} 