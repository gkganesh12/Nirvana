import { Controller, Get, Delete, Param, UseGuards, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { prisma } from '@signalcraft/database';
import { CorrelationService } from './correlation.service';

@ApiTags('Correlation Rules')
@ApiBearerAuth()
@Controller('api/correlation-rules')
@UseGuards(ClerkAuthGuard)
export class CorrelationRulesController {
    constructor(private readonly correlationService: CorrelationService) { }

    @Get()
    @ApiOperation({ summary: 'List all correlation rules' })
    async listRules(
        @WorkspaceId() workspaceId: string,
        @Query('minConfidence') minConfidence?: string,
    ) {
        const confidence = minConfidence ? parseFloat(minConfidence) : 0;

        const rules = await prisma.correlationRule.findMany({
            where: {
                workspaceId,
                confidence: { gte: confidence },
            },
            orderBy: { confidence: 'desc' },
            take: 50,
        });

        // Enrich with alert group titles
        const enrichedRules = await Promise.all(
            rules.map(async (rule) => {
                const [sourceGroup, targetGroup] = await Promise.all([
                    prisma.alertGroup.findFirst({
                        where: { workspaceId, groupKey: rule.sourceGroupKey },
                        select: { id: true, title: true, project: true, severity: true },
                    }),
                    prisma.alertGroup.findFirst({
                        where: { workspaceId, groupKey: rule.targetGroupKey },
                        select: { id: true, title: true, project: true, severity: true },
                    }),
                ]);

                return {
                    ...rule,
                    sourceAlert: sourceGroup,
                    targetAlert: targetGroup,
                };
            })
        );

        return enrichedRules;
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a correlation rule' })
    async deleteRule(
        @WorkspaceId() workspaceId: string,
        @Param('id') ruleId: string,
    ) {
        await prisma.correlationRule.deleteMany({
            where: { id: ruleId, workspaceId },
        });
        return { success: true };
    }

    @Post('analyze')
    @ApiOperation({ summary: 'Trigger correlation analysis' })
    async triggerAnalysis(@WorkspaceId() workspaceId: string) {
        await this.correlationService.analyzeCorrelations(workspaceId);
        return { success: true, message: 'Analysis triggered' };
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get correlation statistics' })
    async getStats(@WorkspaceId() workspaceId: string) {
        const rules = await prisma.correlationRule.findMany({
            where: { workspaceId },
            select: { confidence: true },
        });

        const total = rules.length;
        const highConfidence = rules.filter(r => r.confidence >= 0.7).length;
        const mediumConfidence = rules.filter(r => r.confidence >= 0.5 && r.confidence < 0.7).length;
        const avgConfidence = total > 0
            ? rules.reduce((sum, r) => sum + r.confidence, 0) / total
            : 0;

        return {
            total,
            highConfidence,
            mediumConfidence,
            lowConfidence: total - highConfidence - mediumConfidence,
            avgConfidence: Math.round(avgConfidence * 100) / 100,
        };
    }
}
