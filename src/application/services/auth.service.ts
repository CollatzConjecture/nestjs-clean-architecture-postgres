import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { LoginAuthDto } from '@api/dto/auth/login-auth.dto';
import { MobileAppleAuthDto } from '@api/dto/auth/mobile-apple-auth.dto';
import { MobileGoogleAuthDto } from '@api/dto/auth/mobile-google-auth.dto';
import { RegisterAuthDto } from '@api/dto/auth/register-auth.dto';
import {
  AppleAuthUserPayload,
  CreateAppleAuthUserCommand,
} from '@application/auth/command/create-apple-auth-user.command';
import {
  CreateGoogleAuthUserCommand,
  GoogleAuthUserPayload,
} from '@application/auth/command/create-google-auth-user.command';
import { CreateAuthUserCommand } from '@application/auth/command/create-auth-user.command';
import { DeleteAuthUserCommand } from '@application/auth/command/delete-auth-user.command';
import { AppleOAuthConfigService } from '@application/services/apple-oauth-config.service';
import { AppleTokenValidationService } from '@application/services/apple-token-validation.service';
import { LoggerService } from '@application/services/logger.service';
import { MobileOAuthConfigService } from '@application/services/mobile-oauth-config.service';
import { MobileTokenValidationService } from '@application/services/mobile-token-validation.service';
import {
  GOOGLE_CALLBACK_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  JWT_REFRESH_EXPIRATION_TIME,
  JWT_REFRESH_SECRET,
} from '@constants';
import { AuthUser } from '@domain/entities/Auth';
import { IAuthRepository } from '@domain/interfaces/repositories/auth-repository.interface';
import { IProfileRepository } from '@domain/interfaces/repositories/profile-repository.interface';
import { AuthDomainService } from '@domain/services/auth-domain.service';
import { ProfileDomainService } from '@domain/services/profile-domain.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly commandBus: CommandBus,
    @Inject('IAuthRepository')
    private readonly authRepository: IAuthRepository,
    @Inject('IProfileRepository')
    private readonly profileRepository: IProfileRepository,
    private readonly jwtService: JwtService,
    private readonly logger: LoggerService,
    private readonly authDomainService: AuthDomainService,
    private readonly profileDomainService: ProfileDomainService,
    private readonly mobileTokenValidation: MobileTokenValidationService,
    private readonly mobileOAuthConfig: MobileOAuthConfigService,
    private readonly appleTokenValidation: AppleTokenValidationService,
    private readonly appleOAuthConfig: AppleOAuthConfigService,
  ) {}

  async register(registerDto: RegisterAuthDto): Promise<{
    access_token: string;
    refresh_token: string;
    profile: {
      id: string;
      authId: string;
      name: string;
      lastname?: string;
      age?: number;
    } | null;
  }> {
    const authId = this.authDomainService.generateUserId();
    const profileId = this.profileDomainService.generateProfileId();
    const context = { module: 'AuthService', method: 'register' };

    // Execute the registration command
    await this.commandBus.execute(
      new CreateAuthUserCommand(registerDto, authId, profileId),
    );

    // Wait a brief moment for the user to be created in the database
    await new Promise((resolve) => setTimeout(resolve, 100));

    const auth = await this.authRepository.findById(authId);
    if (!auth) {
      this.logger.err(
        `Failed to find created user with ID: ${authId}`,
        context,
      );
      throw new Error('Registration failed - user not found after creation');
    }

    const { accessToken, refreshToken } = await this.generateTokens(auth);
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.authRepository.update(auth.id, {
      currentHashedRefreshToken: hashedRefreshToken,
      lastLoginAt: new Date(),
    });

    // Try to fetch profile (it might be created asynchronously by saga)
    let profile = null;
    try {
      profile = await this.profileRepository.findByAuthId(authId);
    } catch (_) {
      // ignore
    }

    this.logger.logger(
      `User registered and authenticated successfully: ${auth.email}`,
      context,
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      profile: profile
        ? {
            id: profile.id,
            authId: profile.authId,
            name: profile.name,
            lastname: profile.lastname,
            age: profile.age,
          }
        : null,
    };
  }

  async validateUser(email: string, pass: string): Promise<AuthUser | null> {
    if (!this.authDomainService.isEmailValid(email)) {
      return null;
    }

    const auth = await this.authRepository.findByEmail(email, true);
    if (auth && (await bcrypt.compare(pass, auth.password))) {
      return auth;
    }
    return null;
  }

  async login(loginDto: LoginAuthDto) {
    const { email, password } = loginDto;
    const context = { module: 'AuthService', method: 'login' };
    this.logger.logger(`Attempting to log in user ${email}.`, context);

    if (!this.authDomainService.isEmailValid(email)) {
      throw new UnauthorizedException('Invalid email format');
    }

    const auth = await this.authRepository.findByEmail(email, true);

    if (!auth) {
      this.logger.logger(`User ${email} not found.`, context);
      throw new NotFoundException('User not found');
    }

    if (!(await bcrypt.compare(password, auth.password))) {
      this.logger.warning(`Failed login attempt for user ${email}.`, context);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.authRepository.update(auth.id, {
      lastLoginAt: new Date(),
    });

    const profile = await this.profileRepository.findByAuthId(auth.id);

    const { accessToken, refreshToken } = await this.generateTokens(auth);

    // Store refresh token hash
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.authRepository.update(auth.id, {
      currentHashedRefreshToken: hashedRefreshToken,
    });

    this.logger.logger(`User ${email} logged in successfully.`, context);
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      profile: profile
        ? {
            id: profile.id,
            authId: profile.authId,
            name: profile.name,
            lastname: profile.lastname,
            age: profile.age,
          }
        : null,
    };
  }

  async logout(userId: string): Promise<{ message: string }> {
    await this.authRepository.removeRefreshToken(userId);
    this.logger.logger(`User ${userId} logged out successfully.`, {
      module: 'AuthService',
      method: 'logout',
    });
    return { message: 'User logged out successfully.' };
  }

  async refreshToken(refreshToken: string) {
    const context = { module: 'AuthService', method: 'refreshToken' };

    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: JWT_REFRESH_SECRET,
      });

      const auth = await this.authRepository.findById(payload.sub);
      if (!auth) {
        throw new UnauthorizedException('User not found');
      }

      // Check if refresh token is still valid in database
      if (!auth.currentHashedRefreshToken) {
        throw new UnauthorizedException('Refresh token revoked');
      }

      const isRefreshTokenValid = await bcrypt.compare(
        refreshToken,
        auth.currentHashedRefreshToken,
      );

      if (!isRefreshTokenValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } =
        await this.generateTokens(auth);

      // Store new refresh token hash (token rotation)
      const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
      await this.authRepository.update(auth.id, {
        currentHashedRefreshToken: hashedRefreshToken,
      });

      this.logger.logger(`Token refreshed for user ${auth.email}.`, context);

      return {
        access_token: accessToken,
        refresh_token: newRefreshToken,
      };
    } catch (error) {
      this.logger.logger(`Token refresh failed: ${error.message}`, context);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(auth: AuthUser) {
    const payload = { email: auth.email, sub: auth.id, roles: auth.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: '1h', // Access token expires in 1 hour
      }),
      this.jwtService.signAsync(payload, {
        secret: JWT_REFRESH_SECRET,
        expiresIn: JWT_REFRESH_EXPIRATION_TIME, // Refresh token expires in 7 days
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async findByAuthId(authId: string): Promise<AuthUser | null> {
    const auth = await this.authRepository.findById(authId);
    if (!auth) {
      this.logger.logger(`User ${authId} not found.`, {
        module: 'AuthService',
        method: 'findByAuthId',
      });
      return null;
    }
    return auth;
  }

  initiateGoogleAuth() {
    const state = crypto.randomBytes(20).toString('hex');
    const redirectUrl =
      'https://accounts.google.com/o/oauth2/v2/auth?' +
      `client_id=${GOOGLE_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(GOOGLE_CALLBACK_URL)}` +
      '&response_type=code' +
      '&scope=openid%20email%20profile' +
      '&access_type=offline' +
      `&state=${state}`;
    this.logger.logger('Initiating Google OAuth.', {
      module: 'AuthService',
      method: 'initiateGoogleAuth',
    });
    return { redirectUrl, state };
  }

  async handleGoogleRedirect(code: string, state: string, storedState: string) {
    if (!state || state !== storedState) {
      this.logger.logger('Invalid state or state mismatch.', {
        module: 'AuthService',
        method: 'handleGoogleRedirect',
      });
      throw new UnauthorizedException('Invalid state or state mismatch.');
    }

    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code',
      },
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      },
    );
    const { access_token } = tokenResponse.data;

    const userInfoResponse = await axios.get(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: { Authorization: `Bearer ${access_token}` },
      },
    );
    const user = userInfoResponse.data;

    const result = await this.findOrCreateGoogleUser({
      googleId: user.sub,
      email: user.email,
      firstName: user.given_name || 'Google User',
      lastName: user.family_name || '',
      age: 0,
      picture: user.picture,
    });

    this.logger.logger(`Google user ${user.email} found or created.`, {
      module: 'AuthService',
      method: 'findOrCreateGoogleUser',
    });

    return result;
  }

  async mobileGoogleAuth(mobileAuthDto: MobileGoogleAuthDto) {
    const { platform, idToken, code, code_verifier } = mobileAuthDto;
    const context = { module: 'AuthService', method: 'mobileGoogleAuth' };

    try {
      this.authDomainService.validateMobileOAuthData({
        platform,
        idToken,
        code,
        code_verifier,
      });

      if (!this.mobileOAuthConfig.isPlatformConfigured(platform)) {
        throw new BadRequestException(
          `Google OAuth not configured for ${platform}`,
        );
      }

      let googleUserInfo;

      const hasIdToken = idToken && idToken.trim() !== '';

      if (hasIdToken) {
        // ID Token flow
        googleUserInfo = await this.mobileTokenValidation.validateIdToken(
          idToken,
          platform,
        );
      } else {
        // Authorization Code flow with PKCE
        googleUserInfo =
          await this.mobileTokenValidation.validateAuthorizationCode(
            code,
            code_verifier,
            platform,
          );
      }

      const googleProfile: GoogleAuthUserPayload & { picture?: string } = {
        googleId: googleUserInfo.googleId,
        email: googleUserInfo.email,
        firstName: googleUserInfo.firstName || 'Google User',
        lastName: googleUserInfo.lastName || '',
        age: 0,
        picture: googleUserInfo.picture,
      };

      const authResponse = await this.findOrCreateGoogleUser(googleProfile);
      return authResponse;
    } catch (error) {
      this.logger.err(
        `Mobile Google authentication failed for ${platform}: ${error.message}`,
        context,
      );

      // Convert domain service errors to appropriate HTTP exceptions
      if (
        error.message.includes('Unsupported platform') ||
        error.message.includes('Cannot provide both idToken and code') ||
        error.message.includes('Either idToken or code must be provided') ||
        error.message.includes('Code verifier is required')
      ) {
        throw new BadRequestException(error.message);
      }

      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      throw new UnauthorizedException('Mobile authentication failed');
    }
  }

  async mobileAppleAuth(mobileAuthDto: MobileAppleAuthDto) {
    const { platform, idToken } = mobileAuthDto;
    const context = { module: 'AuthService', method: 'mobileAppleAuth' };

    try {
      this.authDomainService.validateAppleIdTokenFormat(idToken);

      const configValidation =
        this.appleOAuthConfig.validatePlatformConfiguration(platform);
      if (!configValidation.valid) {
        this.logger.err(
          `Apple OAuth configuration invalid for ${platform}: ${configValidation.errors.join(', ')}`,
          context,
        );
        throw new BadRequestException(
          `Apple OAuth not properly configured for ${platform}: ${configValidation.errors.join(', ')}`,
        );
      }

      const appleUserInfo = await this.appleTokenValidation.validateIdToken(
        idToken,
        platform,
      );

      const appleProfile: AppleAuthUserPayload = {
        appleId: appleUserInfo.appleId,
        email: appleUserInfo.email,
        firstName: appleUserInfo.firstName || 'Apple User',
        lastName: appleUserInfo.lastName || '',
        age: 0,
      };

      const result = await this.findOrCreateAppleUser(appleProfile);

      return result;
    } catch (error) {
      this.logger.err(
        `Mobile Apple authentication failed for ${platform}: ${error.message}`,
        context,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      throw new UnauthorizedException('Apple authentication failed');
    }
  }

  async findOrCreateGoogleUser(
    profile: GoogleAuthUserPayload & { picture?: string },
  ) {
    const context = { module: 'AuthService', method: 'findOrCreateGoogleUser' };

    let auth = await this.authRepository.findByGoogleId(profile.googleId);

    if (!auth) {
      auth = await this.authRepository.findByEmail(profile.email);

      if (auth) {
        auth = await this.authRepository.update(auth.id, {
          googleId: profile.googleId,
        });
      } else {
        const existingUser = await this.authRepository.findByEmail(
          profile.email,
        );
        const canCreate = this.authDomainService.canCreateUser(existingUser);
        if (!canCreate) {
          throw new BadRequestException('User already exists with this email');
        }

        const authId = this.authDomainService.generateUserId();
        const profileId = this.profileDomainService.generateProfileId();

        await this.commandBus.execute(
          new CreateGoogleAuthUserCommand(
            {
              email: profile.email,
              firstName: profile.firstName || 'Google User',
              lastName: profile.lastName || '',
              googleId: profile.googleId,
              age: profile.age ?? 0,
            },
            authId,
            profileId,
          ),
        );

        // Wait a brief moment for the user to be created in the database
        await new Promise((resolve) => setTimeout(resolve, 100));

        auth = await this.authRepository.findById(authId);
        if (!auth) {
          this.logger.err(
            `Failed to find created Google user with ID: ${authId}`,
            context,
          );
          throw new Error(
            'Google registration failed - user not found after creation',
          );
        }
      }
    }

    await this.authRepository.update(auth.id, {
      lastLoginAt: new Date(),
    });

    await this.updateProfileWithGoogleData(auth.id, profile);

    const { accessToken, refreshToken } = await this.generateTokens(auth);

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.authRepository.update(auth.id, {
      currentHashedRefreshToken: hashedRefreshToken,
    });

    const userProfile = await this.profileRepository.findByAuthId(auth.id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      profile: userProfile
        ? {
            id: userProfile.id,
            authId: userProfile.authId,
            name: userProfile.name,
            lastname: userProfile.lastname,
            age: userProfile.age,
          }
        : null,
    };
  }

  /**
   * Update profile with Google account information
   */
  private async updateProfileWithGoogleData(
    authId: string,
    googleProfile: GoogleAuthUserPayload & { picture?: string },
  ) {
    const context = {
      module: 'AuthService',
      method: 'updateProfileWithGoogleData',
    };

    try {
      const existingProfile = await this.profileRepository.findByAuthId(authId);

      if (existingProfile) {
        // Update profile with Google data if name is not set or different
        const updates: any = {};

        if (
          googleProfile.firstName &&
          (!existingProfile.name || existingProfile.name === 'Google User')
        ) {
          updates.name = googleProfile.firstName;
        }

        if (
          googleProfile.lastName &&
          (!existingProfile.lastname || existingProfile.lastname === '')
        ) {
          updates.lastname = googleProfile.lastName;
        }

        if (Object.keys(updates).length > 0) {
          await this.profileRepository.update(existingProfile.id, updates);
        }
      }
    } catch (error) {
      this.logger.err(
        `Failed to update profile with Google data: ${error.message}`,
        context,
      );
      // Don't throw error as this is not critical for authentication
    }
  }

  async findOrCreateAppleUser(profile: AppleAuthUserPayload) {
    const context = { module: 'AuthService', method: 'findOrCreateAppleUser' };

    let auth = await this.authRepository.findByAppleId(profile.appleId);

    if (!auth) {
      auth = await this.authRepository.findByEmail(profile.email);

      if (auth) {
        auth = await this.authRepository.update(auth.id, {
          appleId: profile.appleId,
        });
      } else {
        const existingUser = await this.authRepository.findByEmail(
          profile.email,
        );
        const canCreate = this.authDomainService.canCreateUser(existingUser);
        if (!canCreate) {
          throw new BadRequestException('User already exists with this email');
        }

        const authId = this.authDomainService.generateUserId();
        const profileId = this.profileDomainService.generateProfileId();

        await this.commandBus.execute(
          new CreateAppleAuthUserCommand(
            {
              email: profile.email,
              firstName: profile.firstName || 'Apple User',
              lastName: profile.lastName || '',
              appleId: profile.appleId,
              age: profile.age ?? 0,
            },
            authId,
            profileId,
          ),
        );

        // Wait a brief moment for the user to be created in the database
        await new Promise((resolve) => setTimeout(resolve, 100));

        auth = await this.authRepository.findById(authId);
        if (!auth) {
          this.logger.err(
            `Failed to find created Apple user with ID: ${authId}`,
            context,
          );
          throw new Error(
            'Apple registration failed - user not found after creation',
          );
        }
      }
    }

    await this.authRepository.update(auth.id, {
      lastLoginAt: new Date(),
    });

    await this.updateProfileWithAppleData(auth.id, profile);

    const { accessToken, refreshToken } = await this.generateTokens(auth);

    // Store refresh token hash
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.authRepository.update(auth.id, {
      currentHashedRefreshToken: hashedRefreshToken,
    });

    const userProfile = await this.profileRepository.findByAuthId(auth.id);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      profile: userProfile
        ? {
            id: userProfile.id,
            authId: userProfile.authId,
            name: userProfile.name,
            lastname: userProfile.lastname,
            age: userProfile.age,
          }
        : null,
    };
  }

  /**
   * Update profile with Apple account information
   */
  private async updateProfileWithAppleData(
    authId: string,
    appleProfile: AppleAuthUserPayload,
  ) {
    const context = {
      module: 'AuthService',
      method: 'updateProfileWithAppleData',
    };

    try {
      const existingProfile = await this.profileRepository.findByAuthId(authId);

      if (existingProfile) {
        // Update profile with Apple data if name is not set or different
        const updates: any = {};

        if (
          appleProfile.firstName &&
          (!existingProfile.name || existingProfile.name === 'Apple User')
        ) {
          updates.name = appleProfile.firstName;
        }

        if (
          appleProfile.lastName &&
          (!existingProfile.lastname || existingProfile.lastname === '')
        ) {
          updates.lastname = appleProfile.lastName;
        }

        if (Object.keys(updates).length > 0) {
          await this.profileRepository.update(existingProfile.id, updates);
        }
      }
    } catch (error) {
      this.logger.err(
        `Failed to update profile with Apple data: ${error.message}`,
        context,
      );
      // Don't throw error as this is not critical for authentication
    }
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const context = { module: 'AuthService', method: 'changePassword' };

    this.authDomainService.validatePasswordChangeData({
      oldPassword,
      newPassword,
    });

    const auth = await this.authRepository.findById(userId, true);
    if (!auth) {
      throw new NotFoundException('User not found');
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, auth.password);
    if (!isOldPasswordValid) {
      throw new UnauthorizedException('Old password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.authRepository.update(auth.id, {
      password: hashedPassword,
      currentHashedRefreshToken: null,
    });

    this.logger.logger(
      `Password changed successfully for user: ${auth.email}`,
      context,
    );
    return { message: 'Password changed successfully' };
  }

  async deleteByAuthId(authId: string): Promise<{ message: string }> {
    const auth = await this.authRepository.findById(authId);
    if (!auth) {
      this.logger.logger(`Auth user ${authId} not found.`, {
        module: 'AuthService',
        method: 'deleteByAuthId',
      });
      throw new NotFoundException('Auth user not found');
    }

    const profile = await this.profileRepository.findByAuthId(auth.id);
    if (!profile) {
      this.logger.logger(`Profile for auth ${authId} not found.`, {
        module: 'AuthService',
        method: 'deleteByAuthId',
      });
      throw new NotFoundException('Profile not found');
    }

    await this.commandBus.execute(
      new DeleteAuthUserCommand(authId, profile.id),
    );

    return { message: 'User deleted successfully for auth id: ' + authId };
  }
}
