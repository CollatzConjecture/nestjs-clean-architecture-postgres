import { AuthUser } from '@domain/entities/Auth';
import { Role } from '@domain/entities/enums/role.enum';
import { v4 as uuidv4 } from 'uuid';

export interface MobileOAuthData {
  platform: 'ios' | 'android';
  idToken?: string;
  code?: string;
  code_verifier?: string;
}

/**
 * Domain Service for Auth Business Logic
 * Contains pure business rules and logic
 */
export class AuthDomainService {
  /**
   * Business Logic: Validate user login credentials
   * @param email - User email
   * @param plainPassword - Plain text password
   * @param userFromRepo - User data from repository (passed by application layer)
   */
  validateUserLogin(
    email: string,
    plainPassword: string,
    userFromRepo: AuthUser | null,
  ): AuthUser | null {
    if (!email || !plainPassword) {
      return null;
    }

    if (!userFromRepo) {
      return null;
    }

    // Note: Password comparison should be done by application layer
    // Domain just validates business rules
    return userFromRepo;
  }

  /**
   * Business Logic: Create user entity from external provider
   * @param externalData - External provider data
   * @param existingUser - Existing user check result (passed by application layer)
   * @returns AuthUser entity ready for persistence
   */
  createExternalUserEntity(
    externalData: {
      providerId: string;
      email: string;
      firstName: string;
      lastName: string;
      provider: 'google' | undefined;
    },
    existingUser: AuthUser | null,
  ): AuthUser {
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    const newUser: AuthUser = {
      id: this.generateUserId(),
      email: externalData.email,
      password: '',
      role: [Role.USER],
      googleId:
        externalData.provider === 'google'
          ? externalData.providerId
          : undefined,
    };

    return newUser;
  }

  /**
   * Business Logic: Check if user can perform admin actions
   * @param user - User to check
   */
  canPerformAdminActions(user: AuthUser): boolean {
    return user.role.includes(Role.ADMIN);
  }

  /**
   * Business Logic: Validate if user can be created
   * @param existingUser - Existing user check result (passed by application layer)
   */
  canCreateUser(existingUser: AuthUser | null): boolean {
    return !existingUser;
  }

  /**
   * Business Logic: Validate if user can be deleted
   * @param user - User to delete
   * @param requestingUserId - User requesting deletion
   * @param isAdmin - Whether requesting user is admin
   */
  canDeleteUser(
    user: AuthUser,
    requestingUserId: string,
    isAdmin: boolean,
  ): boolean {
    return user.id === requestingUserId || isAdmin;
  }

  /**
   * Business Logic: Check if user exists for deletion (used in compensation actions)
   * @param user - User data from repository (passed by application layer)
   */
  userExistsForDeletion(user: AuthUser | null): boolean {
    return !!user;
  }

  /**
   * Business Logic: Check if user has required role
   * @param user - User to check
   * @param requiredRole - Required role
   */
  hasRole(user: AuthUser, requiredRole: Role): boolean {
    return user.role.includes(requiredRole);
  }

  /**
   * Business Logic: Validate password strength
   * @param password - Password to validate
   */
  isPasswordValid(password: string): boolean {
    // Business rule: Password must be at least 8 characters, contain uppercase, lowercase, and number
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  /**
   * Business Logic: Validate email format
   * @param email - Email to validate
   */
  isEmailValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Business Logic: Validate user creation data
   * @param userData - User data to validate
   */
  validateUserCreation(userData: { email: string; password: string }): void {
    if (!this.isEmailValid(userData.email)) {
      throw new Error('Invalid email format');
    }

    if (!this.isPasswordValid(userData.password)) {
      throw new Error('Password does not meet requirements');
    }
  }

  /**
   * Business Logic: Create user entity with validation
   * @param userData - User creation data
   * @param existingUser - Existing user check result (passed by application layer)
   * @returns AuthUser entity ready for persistence
   */
  createUserEntity(
    userData: { email: string; password: string },
    existingUser: AuthUser | null,
  ): AuthUser {
    this.validateUserCreation(userData);

    if (!this.canCreateUser(existingUser)) {
      throw new Error('User already exists with this email');
    }

    const newUser: AuthUser = {
      id: this.generateUserId(),
      email: userData.email,
      password: userData.password,
      role: [Role.USER],
    };

    return newUser;
  }

  /**
 * Business Logic: Validate mobile platform
 */
  isPlatformSupported(platform: string): platform is 'ios' | 'android' {
    return platform === 'ios' || platform === 'android';
  }

  /**
   * Business Logic: Validate mobile OAuth authentication data
   */
  validateMobileOAuthData(oauthData: MobileOAuthData): void {
    // Validate platform
    if (!this.isPlatformSupported(oauthData.platform)) {
      throw new Error(`Unsupported platform: ${oauthData.platform}`);
    }

    // Validate authentication flow
    const hasIdToken = oauthData.idToken && oauthData.idToken.trim() !== '';
    const hasCode = oauthData.code && oauthData.code.trim() !== '';
    const hasCodeVerifier = oauthData.code_verifier && oauthData.code_verifier.trim() !== '';

    if (hasIdToken && hasCode) {
      throw new Error('Cannot provide both idToken and code. Choose one authentication method.');
    }

    if (!hasIdToken && !hasCode) {
      throw new Error('Either idToken or code must be provided');
    }

    if (hasCode && !hasCodeVerifier) {
      throw new Error('Code verifier is required when using authorization code flow');
    }
  }

  /**
   * Business Logic: Validate ID token format
   */
  validateIdTokenFormat(idToken: string): void {
    if (!idToken || idToken.trim() === '') {
      throw new Error('ID token is required');
    }
  }

  /**
   * Business Logic: Validate authorization code format
   */
  validateAuthorizationCodeFormat(code: string): void {
    if (!code || code.trim() === '') {
      throw new Error('Authorization code is required');
    }
  }

  /**
   * Business Logic: Validate PKCE code verifier format
   */
  validateCodeVerifierFormat(codeVerifier: string): void {
    if (!codeVerifier || codeVerifier.trim() === '') {
      throw new Error('Code verifier is required for PKCE flow');
    }

    // Validate code verifier length (PKCE requirements)
    if (codeVerifier.length < 43 || codeVerifier.length > 128) {
      throw new Error('Code verifier must be between 43 and 128 characters');
    }

    // Check if code verifier contains only allowed characters
    const codeVerifierRegex = /^[A-Za-z0-9\-._~]+$/;
    if (!codeVerifierRegex.test(codeVerifier)) {
      throw new Error('Code verifier contains invalid characters');
    }
  }

  /**
   * Business Logic: Validate Google user data
   */
  validateGoogleUserData(userData: { sub?: string; email?: string }): void {
    if (!userData.sub) {
      throw new Error('Invalid user data: missing subject');
    }

    if (!userData.email) {
      throw new Error('Invalid user data: missing email');
    }

    if (!this.isEmailValid(userData.email)) {
      throw new Error('Invalid email format in user data');
    }
  }

  /**
   * Business Logic: Validate Apple user data
   */
  validateAppleUserData(userData: { sub?: string; email?: string }): void {
    if (!userData.sub) {
      throw new Error('Invalid user data: missing subject');
    }

    if (!userData.email) {
      throw new Error('Invalid user data: missing email');
    }

    if (!this.isEmailValid(userData.email)) {
      throw new Error('Invalid email format in user data');
    }
  }

  /**
   * Business Logic: Validate Apple ID token format
   */
  validateAppleIdTokenFormat(idToken: string): void {
    if (!idToken || idToken.trim() === '') {
      throw new Error('Apple ID token is required');
    }
  }

  /**
 * Business Logic: Validate password change data
 */
  validatePasswordChangeData(data: { oldPassword: string; newPassword: string }): void {
    if (!this.isPasswordValid(data.newPassword)) {
      throw new Error('Password must include at least one uppercase letter, one lowercase letter, and one number');
    }

    if (data.oldPassword === data.newPassword) {
      throw new Error('New password must be different from old password');
    }
  }

  /**
   * Business Logic: Generate user ID
   * @returns Generated user ID
   */
  generateUserId(): string {
    return 'auth-' + uuidv4();
  }
}