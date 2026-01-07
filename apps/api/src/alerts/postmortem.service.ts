import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@signalcraft/database';
import { AiService } from '../ai/ai.service';
import { CorrelationService } from './correlation.service';

@Injectable()
export class PostmortemService {
    private readonly logger = new Logger(PostmortemService.name);

    constructor(
        private readonly aiService: AiService,
        private readonly correlationService: CorrelationService,
    ) { }

    /**
     * Generates a draft postmortem for a resolved alert group.
     */
    async generatePostmortem(workspaceId: string, alertGroupId: string) {
        const group = await prisma.alertGroup.findUnique({
            where: { id: alertGroupId },
            include: {
                alertEvents: {
                    orderBy: { occurredAt: 'asc' },
                    take: 10, // First 10 events for context
                },
            },
        });

        if (!group) throw new Error('Alert group not found');
        if (group.status !== 'RESOLVED') throw new Error('Postmortem can only be generated for resolved alerts');

        // 1. Gather Context
        const correlatedAlerts = await this.correlationService.getCorrelatedAlerts(workspaceId, alertGroupId);
        const correlatedTitles = correlatedAlerts.map(a => a.title).join(', ');

        const durationMins = group.resolvedAt
            ? Math.round((group.resolvedAt.getTime() - group.createdAt.getTime()) / 60000)
            : 0;

        // 2. Build Prompt for AI
        const prompt = `
Generate a concise Incident Postmortem Report for the following resolved alert.

INCIDENT DETAILS:
- Title: ${group.title}
- Project: ${group.project}
- Environment: ${group.environment}
- Severity: ${group.severity}
- Duration: ${durationMins} minutes
- Total Events: ${group.count}
- Impact Stats: ${group.userCount || 0} users affected, ${group.velocityPerHour || 0} events/hour.

RESOLUTION:
- Resolved By: ${group.lastResolvedBy || 'Unknown'}
- Notes: ${group.resolutionNotes || 'No notes provided.'}

CORRELATED ALERTS (Possible Cascading Effects):
${correlatedTitles || 'None found.'}

TIMELINE SNAPSHOT (First few events):
${group.alertEvents.map(e => `- [${e.occurredAt.toISOString()}] ${e.message}`).join('\n')}

OUTPUT FORMAT:
Please structure the response as Markdown with the following sections:
1. **Executive Summary**: Brief overview of what happened.
2. **Impact Analysis**: Who was affected and how severely.
3. **Root Cause Analysis (Inferred)**: Based on the events and resolution, what likely went wrong?
4. **Resolution Timeline**: Key moments (Start, Ack, Resolve).
5. **Lessons Learned**: Suggestions to prevent recurrence.
        `;

        // 3. Generate Draft
        // We reuse callGemini from AiService, but we need to expose a generic method or add a specific one.
        // For now, I'll assume I can add a method to AiService or reuse an existing one if flexible.
        // Since AiService is strict about suggestions, I will add a generic 'generateContent' method to AiService in the next step.
        // For this step, I will use a placeholder call and then modify AiService.

        return this.aiService.generateContent(prompt);
    }
}
