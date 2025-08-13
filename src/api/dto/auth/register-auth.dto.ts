import { IsEmail, IsNotEmpty, IsString, MinLength, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterAuthDto {
  @ApiProperty({ description: "User's first name", example: 'John' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: "User's last name", example: 'Doe', required: false })
  @IsOptional()
  @IsString()
  lastname?: string;

  @ApiProperty({ description: "User's age", example: 30, required: false })
  @IsOptional()
  @IsNumber()
  age?: number;

  @ApiProperty({ description: "User's email address", example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'The password for the user', minLength: 8, example: 'mySecurePassword123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
} 