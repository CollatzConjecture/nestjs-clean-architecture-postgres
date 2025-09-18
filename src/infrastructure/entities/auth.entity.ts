import { Role } from '@domain/entities/enums/role.enum';
import { ProfileEntity } from '@infrastructure/entities/profile.entity';
import { SoftDeletableEntity } from '@infrastructure/entities/base/soft-deletable.entity';
import * as bcrypt from 'bcrypt';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  OneToOne,
  PrimaryColumn
} from 'typeorm';

@Entity('auths')
export class AuthEntity extends SoftDeletableEntity {
  @PrimaryColumn({ name: 'id' })
  id: string;

  @Column({ name: 'email', unique: true })
  email: string;

  @Column({ name: 'password', select: false, nullable: true })
  password?: string;

  @Column({ name: 'google_id', unique: true, nullable: true })
  googleId?: string;

  @Column({ name: 'apple_id', unique: true, nullable: true })
  appleId?: string;

  @Column('varchar', {
    name: 'role',
    array: true,
    default: [Role.USER],
  })
  role: Role[];

  @Column({ name: 'current_hashed_refresh_token', nullable: true, select: false })
  currentHashedRefreshToken?: string;

  @Column({ name: 'last_login_at', nullable: true })
  lastLoginAt?: Date;

  @OneToOne(() => ProfileEntity, profile => profile.auth)
  profile: ProfileEntity;

  @BeforeInsert()
  async beforeInsert() {
    // Hash password if it exists and is not already hashed
    if (this.password && !this.password.startsWith('$2b$')) {
      this.password = await bcrypt.hash(this.password, 10);
    }

    // Ensure role is always set to default if not provided
    if (!this.role || this.role.length === 0) {
      this.role = [Role.USER];
    }
  }

  @BeforeUpdate()
  async beforeUpdate() {
    // Hash password if it exists and is not already hashed
    if (this.password && !this.password.startsWith('$2b$')) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }
}