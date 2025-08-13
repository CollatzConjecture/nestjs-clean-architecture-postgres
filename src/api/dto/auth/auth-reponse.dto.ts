import { ApiProperty } from '@nestjs/swagger';

export class ProfileResponseDto {
  @ApiProperty({ example: 'profile-123' })
  id: string;

  @ApiProperty({ example: 'auth-123', required: false })
  authId?: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'Doe', required: false, nullable: true })
  lastname?: string;

  @ApiProperty({ example: 25, required: false })
  age?: number;
}

export class TokenRefreshResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  access_token: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refresh_token: string;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'Registration successful - you are now logged in.' })
  message: string;

  @ApiProperty({ example: 'auth-123', required: false })
  authId?: string;

  @ApiProperty({ example: 'profile-123', required: false })
  profileId?: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  access_token: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refresh_token: string;

  @ApiProperty({ type: ProfileResponseDto, required: false, nullable: true })
  profile?: ProfileResponseDto | null;
} 