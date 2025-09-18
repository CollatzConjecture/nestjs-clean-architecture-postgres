import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

/**
 * DTO for mobile Apple authentication
 * Supports Apple Sign In with ID token
 */
export class MobileAppleAuthDto {
  @ApiProperty({
    description: 'Apple ID token from Sign in with Apple',
    required: true,
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsNotEmpty({ message: 'Apple ID token is required' })
  @IsString({ message: 'ID token must be a string' })
  @Transform(({ value }) => value?.trim())
  idToken: string;

  @ApiProperty({
    description: 'Mobile platform',
    required: true,
    enum: ['ios', 'android'],
    example: 'ios',
  })
  @IsNotEmpty({ message: 'Platform is required' })
  @IsIn(['ios', 'android'], { message: 'Platform must be either "ios" or "android"' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  platform: 'ios' | 'android';

  @ApiProperty({
    description: 'User identifier from Apple (optional, extracted from token if not provided)',
    required: false,
    example: '000123.abc456def789.1234',
  })
  @IsOptional()
  @IsString({ message: 'User identifier must be a string' })
  @Transform(({ value }) => value?.trim())
  user?: string;

  @ApiProperty({
    description: 'Authorization code from Apple (optional)',
    required: false,
    example: 'c1234567890abcdef...',
  })
  @IsOptional()
  @IsString({ message: 'Authorization code must be a string' })
  @Transform(({ value }) => value?.trim())
  authorizationCode?: string;
}
