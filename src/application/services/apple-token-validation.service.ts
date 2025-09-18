import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, JWTPayload, decodeJwt } from 'jose';
import { AuthDomainService } from '@domain/services/auth-domain.service';
import { LoggerService } from '@application/services/logger.service';
import { AppleOAuthConfigService } from '@application/services/apple-oauth-config.service';

export interface AppleUserInfo {
  appleId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

@Injectable()
export class AppleTokenValidationService {
  private readonly APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
  private readonly APPLE_ISSUER = 'https://appleid.apple.com';
  private jwks: any;

  constructor(
    private readonly authDomainService: AuthDomainService,
    private readonly logger: LoggerService,
    private readonly appleOAuthConfig: AppleOAuthConfigService,
  ) {
    this.initializeJWKS();
  }

  private async initializeJWKS() {
    try {
      this.jwks = createRemoteJWKSet(new URL(this.APPLE_JWKS_URL));
      this.logger.logger('Apple JWKS initialized successfully', {
        module: 'AppleTokenValidationService',
        method: 'initializeJWKS',
      });
    } catch (error) {
      this.logger.err(`Failed to initialize Apple JWKS: ${error.message}`, {
        module: 'AppleTokenValidationService',
        method: 'initializeJWKS',
      });
      this.jwks = null;
    }
  }

  /**
   * Validate Apple ID token and extract user information
   */
  async validateIdToken(idToken: string, platform: 'ios' | 'android'): Promise<AppleUserInfo> {
    const context = { module: 'AppleTokenValidationService', method: 'validateIdToken' };

    try {
      this.authDomainService.validateAppleIdTokenFormat(idToken);

      if (!this.jwks) {
        throw new UnauthorizedException('Apple JWKS not initialized');
      }

      // Get the expected audiences (client IDs) for the platform
      const expectedAudiences = this.appleOAuthConfig.getAudiences(platform);

      // Verify JWT signature and claims
      const { payload } = await jwtVerify(idToken, this.jwks, {
        issuer: this.APPLE_ISSUER,
        audience: expectedAudiences.length === 1 ? expectedAudiences[0] : expectedAudiences,
        clockTolerance: '5s',
      });

      // Validate required claims
      this.validateRequiredClaims(payload);

      // Validate Apple user data
      this.authDomainService.validateAppleUserData({
        sub: String(payload.sub || ''),
        email: String(payload.email || ''),
      });

      this.logger.logger(
        `Apple ID token validated successfully for platform: ${platform}`,
        context,
      );

      const userInfo: AppleUserInfo = {
        appleId: String(payload.sub),
        email: String(payload.email),
      };

      if (typeof payload.given_name === 'string' && payload.given_name.trim() !== '') {
        userInfo.firstName = payload.given_name;
      }

      if (typeof payload.family_name === 'string' && payload.family_name.trim() !== '') {
        userInfo.lastName = payload.family_name;
      }

      return userInfo;
    } catch (error) {
      this.logger.err(
        `Apple ID token validation failed for ${platform}: ${error.message}`,
        context,
      );

      // Handle JWT verification errors with more specific messages
      if (error.code === 'ERR_JWT_EXPIRED') {
        throw new UnauthorizedException('Apple ID token has expired');
      }

      if (error.code === 'ERR_JWT_INVALID') {
        throw new UnauthorizedException('Invalid Apple ID token format');
      }

      if (error.code === 'ERR_JWT_SIGNATURE_VERIFICATION_FAILED') {
        throw new UnauthorizedException('Apple ID token signature verification failed');
      }

      if (
        error.code === 'ERR_JWT_AUDIENCE_INVALID' ||
        error.message?.includes('unexpected "aud" claim value')
      ) {
        try {
          const decoded = decodeJwt(idToken);
          const tokenAud = decoded?.aud;
          const tokenAudString = JSON.stringify(tokenAud);
          const expectedAudiences = JSON.stringify(this.appleOAuthConfig.getAudiences(platform));
          this.logger.err(
            `Apple ID token audience mismatch. token aud=${tokenAudString} 
            expected=${expectedAudiences}`,
            context,
          );
        } catch (decodeError) {
          const decodeMessage =
            decodeError instanceof Error ? decodeError.message : String(decodeError);
          this.logger.warning(
            `Failed to decode Apple ID token while handling audience mismatch: ${decodeMessage}`,
            context,
          );
        }
        throw new UnauthorizedException('Apple ID token audience mismatch');
      }

      if (error.code === 'ERR_JWT_ISSUER_INVALID') {
        throw new UnauthorizedException('Apple ID token issuer invalid');
      }

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException(`Invalid Apple ID token: ${error.message}`);
    }
  }

  /**
   * Validate required claims in the Apple JWT payload
   */
  private validateRequiredClaims(payload: JWTPayload): void {
    const requiredClaims = ['sub', 'email'];
    const missingClaims = requiredClaims.filter(claim => !payload[claim]);

    if (missingClaims.length > 0) {
      throw new UnauthorizedException(`Missing required claims: ${missingClaims.join(', ')}`);
    }

    // Validate email format
    const email = String(payload.email);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new UnauthorizedException('Invalid email format in Apple ID token');
    }

    // Validate sub (subject) is not empty
    if (!payload.sub || String(payload.sub).trim() === '') {
      throw new UnauthorizedException('Invalid subject claim in Apple ID token');
    }
  }

  /**
   * Check if Apple JWKS is properly initialized
   */
  isJWKSInitialized(): boolean {
    return !!this.jwks;
  }

  /**
   * Refresh Apple JWKS if initialization failed or needs update
   */
  async refreshJWKS(): Promise<void> {
    const context = { module: 'AppleTokenValidationService', method: 'refreshJWKS' };
    this.logger.logger('Refreshing Apple JWKS...', context);
    await this.initializeJWKS();
  }
}
