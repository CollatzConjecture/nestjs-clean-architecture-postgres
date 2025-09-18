import { AuthUser } from '@domain/entities/Auth';
import { IAuthRepository } from '@domain/interfaces/repositories/auth-repository.interface';
import { AuthEntity } from '@infrastructure/entities/auth.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

export type AuthUserResponse = AuthUser & {
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class AuthRepository implements IAuthRepository {
  constructor(
    @InjectRepository(AuthEntity)
    private readonly authRepository: Repository<AuthEntity>,
  ) { }

  async create(authData: Partial<AuthUser>): Promise<AuthUser> {
    const newAuth = this.authRepository.create(authData);
    const savedAuth = await this.authRepository.save(newAuth);
    return this.mapToAuthUser(savedAuth);
  }

  async findByEmail(email: string, withPassword?: boolean): Promise<AuthUser | null> {
    const queryBuilder = this.authRepository.createQueryBuilder('auth')
      .where('auth.email = :email', { email });

    if (withPassword) {
      queryBuilder.addSelect('auth.password');
      queryBuilder.addSelect('auth.currentHashedRefreshToken');
    }

    const auth = await queryBuilder.getOne();
    return auth ? this.mapToAuthUser(auth) : null;
  }

  async findById(id: string, withPassword?: boolean): Promise<AuthUser | null> {
    const queryBuilder = this.authRepository.createQueryBuilder('auth')
      .addSelect('auth.currentHashedRefreshToken')
      .where('auth.id = :id', { id });

    if (withPassword) {
      queryBuilder.addSelect('auth.password');
    }

    const auth = await queryBuilder.getOne();
    return auth ? this.mapToAuthUser(auth) : null;
  }

  async findByGoogleId(googleId: string): Promise<AuthUser | null> {
    const auth = await this.authRepository.findOne({ where: { googleId } });
    return auth ? this.mapToAuthUser(auth) : null;
  }

  async findByAppleId(appleId: string): Promise<AuthUser | null> {
    const auth = await this.authRepository.findOne({
      where: { appleId, deletedAt: IsNull() } as any,
    });
    return auth ? this.mapToAuthUser(auth) : null;
  }

  async update(id: string, authData: Partial<AuthUser>): Promise<AuthUser> {
    const result = await this.authRepository.update({ id }, authData);

    if (result.affected === 0) {
      throw new Error('Auth user not found');
    }

    const updatedAuth = await this.findById(id);
    if (!updatedAuth) {
      throw new Error('Auth user not found after update');
    }

    return updatedAuth;
  }

  async delete(id: string): Promise<void> {
    await this.authRepository.delete({ id });
  }

  async removeRefreshToken(id: string): Promise<void> {
    await this.authRepository.update({ id }, { currentHashedRefreshToken: null });
  }

  private mapToAuthUser(authEntity: AuthEntity): AuthUserResponse {
    return {
      id: authEntity.id,
      email: authEntity.email,
      password: authEntity.password || '',
      googleId: authEntity.googleId,
      appleId: authEntity.appleId,
      role: authEntity.role,
      currentHashedRefreshToken: authEntity.currentHashedRefreshToken,
      createdAt: authEntity.createdAt,
      updatedAt: authEntity.updatedAt,
    };
  }
}
