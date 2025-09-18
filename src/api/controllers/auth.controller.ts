import { AuthResponseDto, TokenRefreshResponseDto } from '@api/dto/auth/auth-reponse.dto';
import { ChangePasswordDto } from '@api/dto/auth/change-password.dto';
import { LoginAuthDto } from '@api/dto/auth/login-auth.dto';
import { MobileAppleAuthDto } from '@api/dto/auth/mobile-apple-auth.dto';
import { MobileGoogleAuthDto } from '@api/dto/auth/mobile-google-auth.dto';
import { RefreshTokenDto } from '@api/dto/auth/refresh-token.dto';
import { RegisterAuthDto } from '@api/dto/auth/register-auth.dto';
import { CurrentUserId } from '@application/decorators/current-user.decorator';
import { LoggingInterceptor } from '@application/interceptors/logging.interceptor';
import { AuthService } from '@application/services/auth.service';
import { ResponseService } from '@application/services/response.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Request,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Request as ExpressRequest, Response } from 'express';

@ApiTags('auth')
@Controller({
  path: 'auth',
  version: '1',
})
@UseGuards(ThrottlerGuard)
@UseInterceptors(LoggingInterceptor)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly responseService: ResponseService,
  ) { }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async register(@Body() registerDto: RegisterAuthDto) {
    const result = await this.authService.register(registerDto);
    return this.responseService.created(
      result,
      'User registration initiated successfully',
    );
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('login')
  @ApiOperation({ summary: 'Log in a user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async login(@Body() loginDto: LoginAuthDto) {
    const result = await this.authService.login(loginDto);
    return this.responseService.success('Login successful', result);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('mobile/google')
  @ApiOperation({
    summary: 'Mobile Google OAuth authentication',
    description: 'Authenticate mobile users using Google OAuth. Supports both ID token and authorization code flows with PKCE.'
  })
  @ApiResponse({
    status: 200,
    description: 'Mobile authentication successful.',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid platform or missing required fields.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid Google token or authorization code.' })
  async mobileGoogleAuth(@Body() mobileAuthDto: MobileGoogleAuthDto) {
    const result = await this.authService.mobileGoogleAuth(mobileAuthDto);
    return this.responseService.success('Mobile authentication successful', result);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('mobile/apple')
  @ApiOperation({
    summary: 'Mobile Apple OAuth authentication',
    description: 'Authenticate mobile users using Apple Sign In with ID token.'
  })
  @ApiResponse({
    status: 200,
    description: 'Mobile Apple authentication successful.',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid platform or missing required fields.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Invalid Apple ID token.' })
  async mobileAppleAuth(@Body() mobileAuthDto: MobileAppleAuthDto) {
    const result = await this.authService.mobileAppleAuth(mobileAuthDto);
    return this.responseService.success('Mobile Apple authentication successful', result);
  }

  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password for the current user' })
  @ApiResponse({ status: 200, description: 'Password changed successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  async changePassword(@CurrentUserId() userId: string, @Body() dto: ChangePasswordDto) {
    const result = await this.authService.changePassword(userId, dto.oldPassword, dto.newPassword);
    return this.responseService.success(result.message);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log out the current user' })
  @ApiResponse({ status: 200, description: 'User successfully logged out.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async logout(@Request() req) {
    const result = await this.authService.logout(req.user.id);
    return this.responseService.success(result.message);
  }

  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'New access token generated.',
    type: TokenRefreshResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    const result = await this.authService.refreshToken(refreshTokenDto.refresh_token);
    return this.responseService.success('Token refreshed successfully', result);
  }

  @Get('google')
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  async googleAuth(@Res() res: Response) {
    const { redirectUrl, state } = this.authService.initiateGoogleAuth();
    res.cookie('oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    });
    res.redirect(redirectUrl);
  }

  @Get('google/redirect')
  @ApiOperation({ summary: 'Handle Google OAuth callback' })
  async googleAuthRedirect(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const storedState = req.cookies['oauth_state'];
    const result = await this.authService.handleGoogleRedirect(
      code,
      state,
      storedState,
    );

    // Clear the cookie after use
    res.clearCookie('oauth_state');

    return this.responseService.success(
      'Google authentication successful',
      result,
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile by auth id' })
  @ApiResponse({ status: 200, description: 'Returns user profile.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getProfile(@Param('id') id: string) {
    const user = await this.authService.findByAuthId(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.responseService.retrieved(
      user,
      'User profile retrieved successfully',
    );
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete user (auth + profile) by auth id' })
  @ApiResponse({ status: 200, description: 'User deleted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async deleteUser(@Param('id') id: string) {
    const result = await this.authService.deleteByAuthId(id);
    return this.responseService.success(result.message);
  }
}