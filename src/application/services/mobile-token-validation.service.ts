import { JWKSTokenValidationService } from '@application/services/jwks-token-validation.service';
import { LoggerService } from '@application/services/logger.service';
import { MobileOAuthConfigService } from '@application/services/mobile-oauth-config.service';
import { AuthDomainService } from '@domain/services/auth-domain.service';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import axios from 'axios';

export interface GoogleUserInfo {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  picture: string;
}

@Injectable()
export class MobileTokenValidationService {
  constructor(
    private readonly mobileOAuthConfig: MobileOAuthConfigService,
    private readonly logger: LoggerService,
    private readonly authDomainService: AuthDomainService,
    private readonly jwksTokenValidation: JWKSTokenValidationService,
  ) {}

  /**
   * Validate Google ID token for mobile authentication (simplified for MVP)
   */
  async validateIdToken(
    idToken: string,
    platform: 'ios' | 'android',
    nonce?: string,
  ): Promise<GoogleUserInfo> {
    const context = {
      module: 'MobileTokenValidationService',
      method: 'validateIdToken',
    };

    try {
      this.logger.logger(
        `Validating ID token for ${platform} platform`,
        context,
      );
      this.authDomainService.validateIdTokenFormat(idToken);

      if (!this.jwksTokenValidation.isJWKSInitialized()) {
        this.logger.logger(
          `JWKS not initialized, attempting to refresh for ${platform}`,
          context,
        );
        await this.jwksTokenValidation.refreshJWKS();

        if (!this.jwksTokenValidation.isJWKSInitialized()) {
          throw new UnauthorizedException(
            'Unable to initialize JWT validation service',
          );
        }
      }

      const verifiedUserInfo = await this.jwksTokenValidation.verifyIdToken(
        idToken,
        platform,
        nonce,
      );

      this.authDomainService.validateGoogleUserData({
        sub: verifiedUserInfo.googleId,
        email: verifiedUserInfo.email,
      });

      const userInfo: GoogleUserInfo = {
        googleId: verifiedUserInfo.googleId,
        email: verifiedUserInfo.email,
        firstName: verifiedUserInfo.firstName,
        lastName: verifiedUserInfo.lastName,
        picture: verifiedUserInfo.picture,
      };

      this.logger.logger(
        `ID token validation successful for ${platform}`,
        context,
      );

      return userInfo;
    } catch (error) {
      this.logger.err(
        `ID token validation failed for ${platform}: ${error.message}`,
        context,
      );

      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Convert domain service errors to appropriate HTTP exceptions
      if (error.message.includes('ID token is required')) {
        throw new BadRequestException(error.message);
      }

      throw new UnauthorizedException('Invalid ID token');
    }
  }

  /**
   * Exchange authorization code for tokens and validate with PKCE
   */
  async validateAuthorizationCode(
    code: string,
    codeVerifier: string,
    platform: 'ios' | 'android',
  ): Promise<GoogleUserInfo> {
    const context = {
      module: 'MobileTokenValidationService',
      method: 'validateAuthorizationCode',
    };

    try {
      this.logger.logger(
        `Exchanging authorization code for ${platform} platform`,
        context,
      );

      this.authDomainService.validateAuthorizationCodeFormat(code);
      this.authDomainService.validateCodeVerifierFormat(codeVerifier);

      // Get the client ID for the platform
      const clientId = this.mobileOAuthConfig.getClientId(platform);
      const redirectUri = this.mobileOAuthConfig.getRedirectUri(platform);

      // Exchange code for tokens with PKCE (send as x-www-form-urlencoded)
      const params = new URLSearchParams();
      params.append('code', code);
      params.append('client_id', clientId);
      params.append('code_verifier', codeVerifier);
      params.append('grant_type', 'authorization_code');
      params.append('redirect_uri', redirectUri);

      const tokenResponse = await axios.post(
        'https://oauth2.googleapis.com/token',
        params.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      const { access_token } = tokenResponse.data;

      if (!access_token) {
        throw new UnauthorizedException('No access token received from Google');
      }

      // Get user info using the access token
      return await this.getUserInfoFromAccessToken(access_token);
    } catch (error) {
      this.logger.err(
        `Authorization code validation failed for ${platform}: ${error.message}`,
        context,
      );
      if (error.response) {
        this.logger.err(
          `Google error: ${JSON.stringify(error.response.data)}`,
          context,
        );
      }

      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.error === 'invalid_grant') {
          throw new BadRequestException(
            'Invalid authorization code or code verifier',
          );
        }
        throw new BadRequestException('Invalid authorization code');
      }

      // Convert domain service errors to appropriate HTTP exceptions
      if (
        error.message.includes('Authorization code is required') ||
        error.message.includes('Code verifier is required') ||
        error.message.includes('Code verifier must be between') ||
        error.message.includes('Code verifier contains invalid characters')
      ) {
        throw new BadRequestException(error.message);
      }

      throw new UnauthorizedException('Failed to validate authorization code');
    }
  }

  /**
   * Get Google user info from access token
   */
  async getUserInfoFromAccessToken(
    accessToken: string,
  ): Promise<GoogleUserInfo> {
    const context = {
      module: 'MobileTokenValidationService',
      method: 'getUserInfoFromAccessToken',
    };

    try {
      this.logger.logger('Fetching user info from Google API', context);

      const response = await axios.get(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      const userData = response.data;

      this.authDomainService.validateGoogleUserData(userData);

      const userInfo: GoogleUserInfo = {
        googleId: userData.sub,
        email: userData.email,
        firstName: userData.given_name || userData.name,
        lastName:
          userData.family_name ||
          (userData.name
            ? String(userData.name).split(' ').slice(1).join(' ')
            : ''),
        picture: userData.picture,
      };

      this.logger.logger('User info fetched successfully', context);

      return userInfo;
    } catch (error) {
      this.logger.err(`Failed to fetch user info: ${error.message}`, context);

      // Convert domain service errors to appropriate HTTP exceptions
      if (error.message.includes('Invalid user data')) {
        throw new UnauthorizedException(error.message);
      }

      throw new UnauthorizedException('Failed to fetch user information');
    }
  }
}
