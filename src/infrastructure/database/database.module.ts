import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DATABASE_URL } from '@constants';
import { AuthEntity } from '@infrastructure/entities/auth.entity';
import { ProfileEntity } from '@infrastructure/entities/profile.entity';
import { FinancialAccountEntity } from '@infrastructure/entities/financial-account.entity';
import { TransactionEntity } from '@infrastructure/entities/transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: DATABASE_URL,
      entities: [AuthEntity, ProfileEntity, FinancialAccountEntity, TransactionEntity],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }),
    TypeOrmModule.forFeature([AuthEntity, ProfileEntity, FinancialAccountEntity, TransactionEntity]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
