import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class AlertPolicyConditionDto {
  @ApiProperty({ example: 'metric_threshold' })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty({ example: 'cpu_usage', required: false })
  @IsString()
  @IsOptional()
  metric?: string;

  @ApiProperty({ example: 'gt', required: false })
  @IsString()
  @IsOptional()
  operator?: string;

  @ApiProperty({ example: 90, required: false })
  @IsOptional()
  value?: number;
}

export class CreateAlertPolicyDto {
  @ApiProperty({ example: 'Critical DB Alerts' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'default/critical-db-alerts', required: false })
  @IsString()
  @IsOptional()
  externalId?: string;

  @ApiProperty({ example: 'critical' })
  @IsString()
  @IsNotEmpty()
  severity!: string;

  @ApiProperty({ example: 'db-team' })
  @IsString()
  @IsNotEmpty()
  routingKey!: string;

  @ApiProperty({
    example: [{ type: 'metric_threshold', metric: 'cpu_usage', operator: 'gt', value: 90 }],
  })
  @IsArray()
  conditions!: AlertPolicyConditionDto[];
}

export class UpdateAlertPolicyDto {
  @ApiProperty({ example: 'Critical DB Alerts', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'critical', required: false })
  @IsString()
  @IsOptional()
  severity?: string;

  @ApiProperty({ example: 'db-team', required: false })
  @IsString()
  @IsOptional()
  routingKey?: string;

  @ApiProperty({
    required: false,
    example: [{ type: 'metric_threshold', metric: 'cpu_usage', operator: 'gt', value: 90 }],
  })
  @IsArray()
  @IsOptional()
  conditions?: AlertPolicyConditionDto[];
}

export class UpsertAlertPolicyDto extends CreateAlertPolicyDto {}
