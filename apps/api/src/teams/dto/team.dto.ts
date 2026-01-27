import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({ example: 'Database SRE' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'Primary on-call for DB alerts', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateTeamDto {
  @ApiProperty({ example: 'Database SRE', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'Primary on-call for DB alerts', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class AddTeamMemberDto {
  @ApiProperty({ example: 'user_123' })
  @IsString()
  @IsNotEmpty()
  userId!: string;
}
