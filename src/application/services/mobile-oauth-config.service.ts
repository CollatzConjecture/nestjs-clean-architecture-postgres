import { Injectable, BadRequestException } from '@nestjs/common';
import { LoggerService } from '@application/services/logger.service';

export interface MobileOAuthConfig {
  ios: {
    clientId: string;
    audience: string;
  };
  android: {
    clientId: string;
    audience: string;
  };
}

@Injectable()
export class MobileOAuthConfigService {
  private readonly config: MobileOAuthConfig;

  constructor(private readonly logger: LoggerService) {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  private loadConfiguration(): MobileOAuthConfig {
    const iosClientId = process.env.GOOGLE_IOS_CLIENT_ID;
    const androidClientId = process.env.GOOGLE_ANDROID_CLIENT_ID;

    if (!iosClientId) {
      this.logger.warning('GOOGLE_IOS_CLIENT_ID not found in environment variables', {
        module: 'MobileOAuthConfigService',
        method: 'loadConfiguration',
      });
    }

    if (!androidClientId) {
      this.logger.warning('GOOGLE_ANDROID_CLIENT_ID not found in environment variables', {
        module: 'MobileOAuthConfigService',
        method: 'loadConfiguration',
      });
    }

    return {
      ios: {
        clientId: iosClientId || '',
        audience: iosClientId || '',
      },
      android: {
        clientId: androidClientId || '',
        audience: androidClientId || '',
      },
    };
  }

  private validateConfiguration(): void {
    const { ios, android } = this.config;

    if (!ios.clientId) {
      this.logger.err('iOS Google OAuth client ID is not configured', {
        module: 'MobileOAuthConfigService',
        method: 'validateConfiguration',
      });
    }

    if (!android.clientId) {
      this.logger.err('Android Google OAuth client ID is not configured', {
        module: 'MobileOAuthConfigService',
        method: 'validateConfiguration',
      });
    }

    const iosConfigured = !!ios.clientId;
    const androidConfigured = !!android.clientId;

    this.logger.logger(`Mobile OAuth configuration loaded - iOS: ${iosConfigured}`, {
      module: 'MobileOAuthConfigService',
      method: 'validateConfiguration',
    });

    this.logger.logger(`Mobile OAuth configuration loaded - Android: ${androidConfigured}`, {
      module: 'MobileOAuthConfigService',
      method: 'validateConfiguration',
    });
  }

  /**
   * Get client ID for a specific platform
   */
  getClientId(platform: 'ios' | 'android'): string {
    const clientId = this.config[platform].clientId;

    if (!clientId) {
      throw new BadRequestException(`Google OAuth client ID for ${platform} is not configured`);
    }

    return clientId;
  }

  /**
   * Get audience for a specific platform (used for ID token validation)
   */
  getAudience(platform: 'ios' | 'android'): string {
    const audience = this.config[platform].audience;

    if (!audience) {
      throw new BadRequestException(`Google OAuth audience for ${platform} is not configured`);
    }

    return audience;
  }

  /**
   * Validate if a platform is supported
   */
  isPlatformSupported(platform: string): platform is 'ios' | 'android' {
    return platform === 'ios' || platform === 'android';
  }

  /**
   * Check if a platform is configured
   */
  isPlatformConfigured(platform: 'ios' | 'android'): boolean {
    return !!this.config[platform].clientId;
  }

  /**
   * Get all supported platforms
   */
  getSupportedPlatforms(): Array<'ios' | 'android'> {
    return ['ios', 'android'];
  }

  /**
   * Get configuration status for all platforms
   */
  getConfigurationStatus(): { ios: boolean; android: boolean } {
    return {
      ios: this.isPlatformConfigured('ios'),
      android: this.isPlatformConfigured('android'),
    };
  }

  /**
   * Get redirect URI for a specific platform
   */
  getRedirectUri(platform: 'ios' | 'android'): string {
    if (platform === 'ios') {
      const uri = process.env.GOOGLE_MOBILE_CALLBACK_IOS_URL;
      if (!uri) {
        throw new BadRequestException('iOS redirect URI not configured');
      }
      return uri;
    } else if (platform === 'android') {
      const uri = process.env.GOOGLE_MOBILE_CALLBACK_ANDROID_URL;
      if (!uri) {
        throw new BadRequestException('Android redirect URI not configured');
      }
      return uri;
    } else {
      throw new BadRequestException(`Unsupported platform: ${platform}`);
    }
  }
} 