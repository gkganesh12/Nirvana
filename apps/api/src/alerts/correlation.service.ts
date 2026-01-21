import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@signalcraft/database';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CorrelationService {
    private readonly logger = new Logger(CorrelationService.name);

    /**
     * Find alerts that are correlated with the given alert group.
     * Returns a list of correlated AlertGroups.
     */
    async getCorrelatedAlerts(workspaceId: string, alertGroupId: string) {
        const group = await prisma.alertGroup.findUnique({
            where: { id: alertGroupId },
        });

        if (!group) return [];

        // Find rules where this group is the "source" or "target"
        // Using groupKey (fingerprint hash) for correlation logic
        const rules = await prisma.correlationRule.findMany({
            where: {
                workspaceId,
                OR: [
                    { sourceGroupKey: group.groupKey },
                    { targetGroupKey: group.groupKey },
                ],
                confidence: { gte: 0.5 }, // Minimal confidence
            },
            orderBy: { confidence: 'desc' },
            take: 5,
        });

        if (rules.length === 0) return [];

        // Extract relevant counterpart groupKeys
        const relatedGroupKeys = rules.map((r) =>
            r.sourceGroupKey === group.groupKey ? r.targetGroupKey : r.sourceGroupKey
        );

        // Find active alerts matching those keys
        // We want alerts that are currently relevant (OPEN or recently resolved)
        // or just generally the alert group definition
        return prisma.alertGroup.findMany({
            where: {
                workspaceId,
                groupKey: { in: relatedGroupKeys },
                // Optionally filter by status closer to "now" if desired, 
                // but for now just showing the related definition is good.
            },
            take: 5,
        });
    }

    /**
     * Analyze historical patterns to generate new correlation rules.
     * This is a simplified version of what would be a background job.
     * It looks for pairs of alerts that occurred within 5 minutes of each other.
     */
    async analyzeCorrelations(workspaceId: string) {
        this.logger.log(`Starting correlation analysis for workspace ${workspaceId}`);

        // 1. Fetch recent events (last 24h for MVP performance)
        const recentEvents = await prisma.alertEvent.findMany({
            where: {
                workspaceId,
                occurredAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
            orderBy: { occurredAt: 'asc' },
            select: {
                id: true,
                alertGroupId: true,
                occurredAt: true,
                alertGroup: { select: { groupKey: true } },
            },
        });

        if (recentEvents.length < 10) return; // Not enough data

        const pairCounts: Record<string, number> = {};
        const groupOccurrenceCounts: Record<string, number> = {};

        // 2. Sliding window analysis (very naive implementation)
        // For each even, look ahead 5 minutes
        for (let i = 0; i < recentEvents.length; i++) {
            const eventA = recentEvents[i];
            if (!eventA.alertGroup?.groupKey) continue;

            const keyA = eventA.alertGroup.groupKey;
            groupOccurrenceCounts[keyA] = (groupOccurrenceCounts[keyA] || 0) + 1;

            for (let j = i + 1; j < recentEvents.length; j++) {
                const eventB = recentEvents[j];
                if (!eventB.alertGroup?.groupKey) continue;
                const keyB = eventB.alertGroup.groupKey;

                if (keyA === keyB) continue; // Ignore self-correlation

                const diffMinutes = (eventB.occurredAt.getTime() - eventA.occurredAt.getTime()) / 60000;
                if (diffMinutes > 5) break; // Window exceeded

                // Found a pair (A -> B)
                const pairKey = `${keyA}::${keyB}`;
                pairCounts[pairKey] = (pairCounts[pairKey] || 0) + 1;
            }
        }

        // 3. Generate Rules
        // Confidence = (PairCount(A,B) / OccurrenceCount(A))
        for (const [pairKey, count] of Object.entries(pairCounts)) {
            if (count < 3) continue; // Minimum support

            const [keyA, keyB] = pairKey.split('::');
            const confidence = count / (groupOccurrenceCounts[keyA] || count);

            if (confidence >= 0.5) {
                // Upsert rule
                await prisma.correlationRule.upsert({
                    where: {
                        workspaceId_sourceGroupKey_targetGroupKey: {
                            workspaceId,
                            sourceGroupKey: keyA,
                            targetGroupKey: keyB,
                        },
                    },
                    update: {
                        confidence,
                        lastUpdatedAt: new Date(),
                    },
                    create: {
                        workspaceId,
                        sourceGroupKey: keyA,
                        targetGroupKey: keyB,
                        confidence,
                    },
                });
                this.logger.log(`Upserted rule: ${keyA} -> ${keyB} (conf: ${confidence.toFixed(2)})`);
            }
        }

        this.logger.log('Correlation analysis complete');
    }

    @Cron(CronExpression.EVERY_HOUR)
    async handleCron() {
        this.logger.debug('Running scheduled correlation analysis');
        const workspaces = await prisma.workspace.findMany({ select: { id: true } });
        for (const w of workspaces) {
            await this.analyzeCorrelations(w.id);
        }
    }
}
