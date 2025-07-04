import { LoggingInterceptor } from "@application/interceptors/logging.interceptor";
import { LoggerService } from "@application/services/logger.service";
import { Controller, UseGuards, UseInterceptors } from "@nestjs/common";
import { Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ThrottlerGuard } from "@nestjs/throttler";

@ApiTags('hello')
@Controller({
  path: 'hello',
  version: '1'
})
@UseGuards(ThrottlerGuard)
@UseInterceptors(LoggingInterceptor)
export class HelloController {
  constructor(private readonly logger: LoggerService) {}

  @Get()
  getHello(): string {
    const context = { module: 'HelloController', method: 'getHello' };
    this.logger.logger('Hello World endpoint called', context);
    return 'Hello World';
  }
}