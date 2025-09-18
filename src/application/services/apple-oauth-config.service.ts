import { Injectable } from '@nestjs/common';
import {
  APPLE_IOS_CLIENT_ID,
  APPLE_ANDROID_CLIENT_ID,
  APPLE_TEAM_ID,
  APPLE_KEY_ID,
  APPLE_PRIVATE_KEY,
  APPLE_IOS_ADDITIONAL_AUDIENCES,
  APPLE_ANDROID_ADDITIONAL_AUDIENCES,
} from '@constants';

export interface AppleOAuthConfig {
  iosClientId: string;
  androidClientId: string;
  teamId: string;
  keyId: string;
  privateKey: string;
  iosAdditionalAudiences: string[];
  androidAdditionalAudiences: string[];
}

@Injectable()
export class AppleOAuthConfigService {
  private readonly config: AppleOAuthConfig = {
    iosClientId: APPLE_IOS_CLIENT_ID || 'com.yourapp.bundle',
    androidClientId: APPLE_ANDROID_CLIENT_ID || 'com.yourapp.android',
    teamId: APPLE_TEAM_ID || '',
    keyId: APPLE_KEY_ID || '',
    privateKey: APPLE_PRIVATE_KEY || '',
    iosAdditionalAudiences: (APPLE_IOS_ADDITIONAL_AUDIENCES || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
    androidAdditionalAudiences: (APPLE_ANDROID_ADDITIONAL_AUDIENCES || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
  };

  /**
   * Get Apple client ID for the specified platform
   */
  getClientId(platform: 'ios' | 'android'): string {
    return platform === 'ios' ? this.config.iosClientId : this.config.androidClientId;
  }

  /**
   * Get list of acceptable audiences for the specified platform
   * Includes primary clientId and any configured alternates (comma-separated envs).
   */
  getAudiences(platform: 'ios' | 'android'): string[] {
    const primary = this.getClientId(platform);
    const extras = platform === 'ios' ? this.config.iosAdditionalAudiences : this.config.androidAdditionalAudiences;
    const all = [primary, ...extras].filter(Boolean);
    // Ensure uniqueness and stable order
    return Array.from(new Set(all));
  }

  /**
   * Get Apple Team ID
   */
  getTeamId(): string {
    return this.config.teamId;
  }

  /**
   * Get Apple Key ID
   */
  getKeyId(): string {
    return this.config.keyId;
  }

  /**
   * Get Apple Private Key
   */
  getPrivateKey(): string {
    return this.config.privateKey;
  }

  /**
   * Validate platform configuration
   */
  validatePlatformConfiguration(platform: 'ios' | 'android'): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const clientId = this.getClientId(platform);

    if (!clientId || clientId.includes('yourapp')) {
      errors.push(`${platform} client ID not configured properly`);
    }

    if (!this.config.teamId) {
      errors.push('Apple Team ID not configured');
    }

    if (!this.config.keyId) {
      errors.push('Apple Key ID not configured');
    }

    if (!this.config.privateKey) {
      errors.push('Apple Private Key not configured');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get configuration for health checks
   */
  getConfig(): AppleOAuthConfig {
    return { ...this.config };
  }
}
