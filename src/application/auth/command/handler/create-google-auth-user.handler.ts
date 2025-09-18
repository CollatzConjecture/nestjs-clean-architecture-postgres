import { IAuthRepository } from '@domain/interfaces/repositories/auth-repository.interface';
import { ConflictException, Inject } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { AuthUserCreatedEvent } from '@application/auth/events/auth-user-created.event';
import { CreateGoogleAuthUserCommand } from '@application/auth/command/create-google-auth-user.command';
import { LoggerService } from '@application/services/logger.service';
import { AuthDomainService } from '@domain/services/auth-domain.service';
import { Role } from '@domain/entities/enums/role.enum';

@CommandHandler(CreateGoogleAuthUserCommand)
export class CreateGoogleAuthUserHandler implements ICommandHandler<CreateGoogleAuthUserCommand> {
  constructor(
    @Inject('IAuthRepository')
    private readonly authRepository: IAuthRepository,
    private readonly eventBus: EventBus,
    private readonly logger: LoggerService,
    private readonly authDomainService: AuthDomainService,
  ) { }

  async execute(command: CreateGoogleAuthUserCommand): Promise<void> {
    const { payload, authId, profileId } = command;
    const { email, firstName, lastName, googleId, age } = payload;
    const context = { module: 'CreateGoogleAuthUserHandler', method: 'execute' };

    this.logger.logger(`Starting Google user registration for email: ${email}`, context);

    const existingUser = await this.authRepository.findByEmail(email);
    const canCreate = this.authDomainService.canCreateUser(existingUser);
    if (!canCreate) {
      this.logger.warning(`Google registration failed - email already exists: ${email}`, context);
      throw new ConflictException('An account with this email already exists.');
    }

    await this.authRepository.create({
      id: authId,
      email,
      password: '', // Empty password for Google users
      googleId,
      role: [Role.USER],
    });

    this.logger.logger(
      `Google auth user created successfully with ID: ${authId}. Dispatching event.`,
      context,
    );

    await this.eventBus.publish(
      new AuthUserCreatedEvent(authId, profileId, firstName, lastName, age),
    );
  }
}
