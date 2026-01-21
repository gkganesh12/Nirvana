import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: 'Unique identifier from Clerk', example: 'user_2xyz...' })
  @IsString()
  clerkId!: string;

  @ApiProperty({ description: 'User email address', example: 'user@company.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ description: 'Optional display name', example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({ description: 'Name of the initial workspace to create', example: 'Default Workspace' })
  @IsString()
  workspaceName!: string;
}
