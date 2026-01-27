import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateServiceAccountDto {
  @ApiProperty({ example: 'Terraform Bot' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'Service account for IaC automation', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateServiceAccountKeyDto {
  @ApiProperty({ example: 'Terraform CI key' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '2030-01-01T00:00:00.000Z', required: false })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
