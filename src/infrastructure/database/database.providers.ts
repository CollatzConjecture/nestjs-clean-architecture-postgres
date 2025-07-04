import { DataSource } from 'typeorm';
import { DB_PROVIDER, DATABASE_URL } from '@constants';
import { AuthEntity } from '@infrastructure/entities/auth.entity';
import { ProfileEntity } from '@infrastructure/entities/profile.entity';
import { FinancialAccountEntity } from '@infrastructure/entities/financial-account.entity';

export const databaseProviders = [
  {
    provide: DB_PROVIDER,
    useFactory: async (): Promise<DataSource> => {
      const dataSource = new DataSource({
        type: 'postgres',
        url: DATABASE_URL,
        entities: [AuthEntity, ProfileEntity, FinancialAccountEntity],
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.NODE_ENV === 'development',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      });

      return dataSource.initialize();
    },
  },
];
