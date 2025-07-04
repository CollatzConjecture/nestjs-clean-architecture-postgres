import { Module } from '@nestjs/common';
import { AuthController } from '@api/controllers/auth.controller';
import { ProfileController } from '@api/controllers/profile.controller';
import { ApplicationModule } from '@application/application.module';
import { HelloController } from './controllers/hello.controller';

@Module({
  imports: [ApplicationModule],
  controllers: [AuthController, ProfileController, HelloController],
})
export class ApiModule {} 