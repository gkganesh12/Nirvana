import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CorrelationService } from './correlation.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';

@ApiTags('Correlation')
@ApiBearerAuth()
@Controller('api/alerts')
@UseGuards(ClerkAuthGuard)
export class CorrelationController {
    constructor(private readonly correlationService: CorrelationService) { }

    @Get(':id/correlations')
    @ApiOperation({ summary: 'Find correlated alerts' })
    @ApiResponse({ status: 200, description: 'Correlated alerts retrieved successfully' })
    async getCorrelations(@Param('id') alertId: string) {
        return this.correlationService.findCorrelatedAlerts(alertId);
    }

    @Get(':id/root-cause')
    @ApiOperation({ summary: 'Suggest root cause for alert' })
    @ApiResponse({ status: 200, description: 'Root cause suggestion retrieved successfully' })
    async getRootCause(@Param('id') alertId: string) {
        return this.correlationService.suggestRootCause(alertId);
    }

    @Get(':id/correlation-history')
    @ApiOperation({ summary: 'Get stored correlation history' })
    @ApiResponse({ status: 200, description: 'Correlation history retrieved successfully' })
    async getCorrelationHistory(@Param('id') alertId: string) {
        return this.correlationService.getStoredCorrelations(alertId);
    }
}
