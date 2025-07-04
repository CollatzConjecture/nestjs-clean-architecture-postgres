import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfileEntity } from '@infrastructure/entities/profile.entity';
import { ProfileRepository } from '@infrastructure/repository/profile.repository';
import { CreateProfileHandler } from '@application/profile/command/handler/create-profile.handler';
import { ProfileService } from '@application/services/profile.service';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { RegistrationSaga } from '@application/auth/sagas/registration.saga';
import { ProfileDomainService } from '@domain/services/profile-domain.service';

export const CommandHandlers = [CreateProfileHandler];
export const Sagas = [RegistrationSaga];

@Module({
  imports: [CqrsModule, DatabaseModule, TypeOrmModule.forFeature([ProfileEntity])],
  providers: [
    ProfileService,
    {
      provide: ProfileDomainService,
      useFactory: (profileRepo) => new ProfileDomainService(profileRepo),
      inject: ['IProfileRepository'],
    },
    {
      provide: 'IProfileRepository',
      useClass: ProfileRepository,
    },

    ...CommandHandlers,
    ...Sagas,
  ],
  exports: [ProfileService, ProfileDomainService, 'IProfileRepository'],
})

export class ProfileModule { } 