import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDashboardDto {
    @ApiProperty({ description: 'Dashboard name' })
    @IsString()
    name!: string;

    @ApiPropertyOptional({ description: 'Dashboard description' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ description: 'Grid layout configuration' })
    @IsObject()
    layout!: Record<string, any>;

    @ApiProperty({ description: 'Array of widget definitions' })
    @IsObject()
    widgets!: Record<string, any>;

    @ApiPropertyOptional({ description: 'Set as default dashboard', default: false })
    @IsBoolean()
    @IsOptional()
    isDefault?: boolean;
}

export class UpdateDashboardDto {
    @ApiPropertyOptional({ description: 'Dashboard name' })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiPropertyOptional({ description: 'Dashboard description' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: 'Grid layout configuration' })
    @IsObject()
    @IsOptional()
    layout?: Record<string, any>;

    @ApiPropertyOptional({ description: 'Widget definitions' })
    @IsObject()
    @IsOptional()
    widgets?: Record<string, any>;

    @ApiPropertyOptional({ description: 'Set as default dashboard' })
    @IsBoolean()
    @IsOptional()
    isDefault?: boolean;
}
