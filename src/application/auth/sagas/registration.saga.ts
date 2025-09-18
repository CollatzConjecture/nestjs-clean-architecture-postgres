import { DeleteAuthUserCommand } from '@application/auth/command/delete-auth-user.command';
import { AuthUserCreatedEvent } from '@application/auth/events/auth-user-created.event';
import { CreateProfileCommand } from '@application/profile/command/create-profile.command';
import { ProfileCreationFailedEvent } from '@application/profile/events/profile-creation-failed.event';
import { Injectable, Logger } from '@nestjs/common';
import { ICommand, Saga, ofType } from '@nestjs/cqrs';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class RegistrationSaga {
  private readonly logger = new Logger(RegistrationSaga.name);

  @Saga()
  userCreated = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(AuthUserCreatedEvent),
      map((event) => {
        this.logger.log(
          `Saga continues: mapping AuthUserCreatedEvent to CreateProfileCommand 
          for user ${event.authId}`,
        );
        return new CreateProfileCommand(
          event.profileId,
          event.authId,
          event.name,
          event.lastname,
          event.age,
        );
      }),
    );
  };

  @Saga()
  profileCreationFailed = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(ProfileCreationFailedEvent),
      map((event) => {
        this.logger.warn(
          `Saga compensates: mapping ProfileCreationFailedEvent to DeleteAuthUserCommand 
          for user ${event.authId}`,
        );
        return new DeleteAuthUserCommand(event.authId, event.profileId);
      }),
    );
  };
}
