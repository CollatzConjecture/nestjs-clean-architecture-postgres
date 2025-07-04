import { AuthModule } from '@application/auth/auth.module';
import { ProfileModule } from '@application/profile/profile.module';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [AuthModule, ProfileModule, DatabaseModule],
  providers: [],
  exports: [AuthModule, ProfileModule],
})
export class ApplicationModule {} 