import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkflowDto {
    @ApiProperty({ description: 'Workflow name' })
    @IsString()
    name!: string;

    @ApiPropertyOptional({ description: 'Workflow description' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'Trigger conditions (severity, tags, etc.)' })
    @IsObject()
    trigger!: Record<string, any>;

    @ApiProperty({ description: 'Array of workflow steps' })
    @IsObject()
    steps!: Record<string, any>;

    @ApiPropertyOptional({ description: 'Enable/disable workflow', default: true })
    @IsBoolean()
    @IsOptional()
    enabled?: boolean;
}

export class UpdateWorkflowDto {
    @ApiPropertyOptional({ description: 'Workflow name' })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional({ description: 'Workflow description' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: 'Trigger conditions' })
    @IsObject()
    @IsOptional()
    trigger?: Record<string, any>;

    @ApiPropertyOptional({ description: 'Workflow steps' })
    @IsObject()
    @IsOptional()
    steps?: Record<string, any>;

    @ApiPropertyOptional({ description: 'Enable/disable workflow' })
    @IsBoolean()
    @IsOptional()
    enabled?: boolean;
}
