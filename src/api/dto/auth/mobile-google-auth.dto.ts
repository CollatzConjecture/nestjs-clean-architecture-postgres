import { IsIn, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for mobile Google authentication
 * Supports both ID token flow and authorization code flow with PKCE
 */
export class MobileGoogleAuthDto {
  @ApiProperty({
    description: 'Google authorization code (for authorization code flow)',
    required: false,
    example: '4/0AfJohXnQq...',
  })
  @IsOptional()
  @IsString({ message: 'Authorization code must be a string' })
  @ValidateIf((o) => !o.idToken)
  code?: string;

  @ApiProperty({
    description: 'Google ID token (for ID token flow)',
    required: false,
    example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsOptional()
  @IsString({ message: 'ID token must be a string' })
  @ValidateIf((o) => !o.code)
  idToken?: string;

  @ApiProperty({
    description: 'PKCE code verifier (required when using authorization code flow)',
    required: false,
    example: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
  })
  @IsOptional()
  @IsString({ message: 'Code verifier must be a string' })
  @ValidateIf((o) => !!o.code)
  code_verifier?: string;

  @ApiProperty({
    description: 'Mobile platform (ios or android)',
    required: true,
    enum: ['ios', 'android'],
    example: 'ios',
  })
  @IsNotEmpty({ message: 'Platform is required' })
  @IsIn(['ios', 'android'], { message: 'Platform must be either "ios" or "android"' })
  platform: 'ios' | 'android';
}