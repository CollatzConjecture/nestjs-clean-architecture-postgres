import { AuthController } from '@api/controllers/auth.controller';
import { HelloController } from '@api/controllers/hello.controller';
import { ProfileController } from '@api/controllers/profile.controller';
import { ApplicationModule } from '@application/application.module';
import { ResponseInterceptor } from '@application/interceptors/response.interceptor';
import { ResponseService } from '@application/services/response.service';
import { Module } from '@nestjs/common';

@Module({
  imports: [ApplicationModule],
  controllers: [AuthController, ProfileController, HelloController],
  providers: [ResponseService, ResponseInterceptor],
})
export class ApiModule { }