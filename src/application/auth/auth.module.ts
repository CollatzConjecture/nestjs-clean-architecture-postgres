import { CreateAuthUserHandler } from '@application/auth/command/handler/create-auth-user.handler';
import { CreateAppleAuthUserHandler } from '@application/auth/command/handler/create-apple-auth-user.handler';
import { CreateGoogleAuthUserHandler } from '@application/auth/command/handler/create-google-auth-user.handler';
import { DeleteAuthUserHandler } from '@application/auth/command/handler/delete-auth-user.handler';
import { GoogleStrategy } from '@application/auth/google.strategy';
import { JwtStrategy } from '@application/auth/jwt.strategy';
import { LocalStrategy } from '@application/auth/local.strategy';
import { ProfileModule } from '@application/profile/profile.module';
import { AuthService } from '@application/services/auth.service';
import { MobileOAuthConfigService } from '@application/services/mobile-oauth-config.service';
import { JWKSTokenValidationService } from '@application/services/jwks-token-validation.service';
import { MobileTokenValidationService } from '@application/services/mobile-token-validation.service';
import { AppleOAuthConfigService } from '@application/services/apple-oauth-config.service';
import { AppleTokenValidationService } from '@application/services/apple-token-validation.service';
import { JWT_EXPIRATION_TIME, JWT_SECRET } from '@constants';
import { AuthDomainService } from '@domain/services/auth-domain.service';
import { DatabaseModule } from '@infrastructure/database/database.module';
import { AuthEntity } from '@infrastructure/entities/auth.entity';
import { AuthRepository } from '@infrastructure/repository/auth.repository';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

export const CommandHandlers = [
  CreateAuthUserHandler,
  DeleteAuthUserHandler,
  CreateAppleAuthUserHandler,
  CreateGoogleAuthUserHandler,
];

@Module({
  imports: [
    CqrsModule,
    DatabaseModule,
    TypeOrmModule.forFeature([AuthEntity]),
    PassportModule,
    ProfileModule,
    JwtModule.register({
      secret: JWT_SECRET,
      signOptions: { expiresIn: JWT_EXPIRATION_TIME },
    }),
  ],
  providers: [
    LocalStrategy,
    JwtStrategy,
    GoogleStrategy,
    AuthService,
    AuthDomainService,
    MobileTokenValidationService,
    MobileOAuthConfigService,
    JWKSTokenValidationService,
    AppleTokenValidationService,
    AppleOAuthConfigService,
    {
      provide: 'IAuthRepository',
      useClass: AuthRepository,
    },

    ...CommandHandlers,
  ],
  exports: [AuthService, AuthDomainService, 'IAuthRepository'],
})

export class AuthModule { } 
