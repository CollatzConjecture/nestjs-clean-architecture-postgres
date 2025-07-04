import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, BeforeInsert, BeforeUpdate } from 'typeorm';
import { Role } from '@domain/entities/enums/role.enum';
import { ProfileEntity } from '@infrastructure/entities/profile.entity';
import * as bcrypt from 'bcrypt';

@Entity('auths')
export class AuthEntity {
  @PrimaryColumn()
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false, nullable: true })
  password?: string;

  @Column({ unique: true, nullable: true })
  googleId?: string;

  @Column('varchar', { 
    array: true, 
    default: [Role.USER] 
  })
  role: Role[];

  @Column({ nullable: true, select: false })
  currentHashedRefreshToken?: string;

  @Column({ nullable: true })
  lastLoginAt?: Date;

  @OneToOne(() => ProfileEntity, profile => profile.auth)
  profile: ProfileEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

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