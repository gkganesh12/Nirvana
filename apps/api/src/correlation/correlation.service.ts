import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@signalcraft/database';

interface CorrelationConfig {
    timeWindowMinutes: number;
    minimumScore: number;
}

@Injectable()
export class CorrelationService {
    private readonly logger = new Logger(CorrelationService.name);
    private readonly config: CorrelationConfig = {
        timeWindowMinutes: 5,
        minimumScore: 0.5,
    };

    async findCorrelatedAlerts(alertId: string): Promise<any[]> {
        const alert = await prisma.alertGroup.findUnique({
            where: { id: alertId },
        });

        if (!alert) {
            throw new Error('Alert not found');
        }

        // Find alerts within time window
        const timeWindowStart = new Date(alert.firstSeenAt.getTime() - this.config.timeWindowMinutes * 60 * 1000);
        const timeWindowEnd = new Date(alert.firstSeenAt.getTime() + this.config.timeWindowMinutes * 60 * 1000);

        const candidateAlerts = await prisma.alertGroup.findMany({
            where: {
                workspaceId: alert.workspaceId,
                id: { not: alertId },
                firstSeenAt: {
                    gte: timeWindowStart,
                    lte: timeWindowEnd,
                },
            },
        });

        // Calculate correlation scores
        const correlations = candidateAlerts.map((candidate) => {
            const score = this.calculateCorrelationScore(alert, candidate);
            const reason = this.determineCorrelationReason(alert, candidate, score);

            return {
                alert: candidate,
                score,
                reason,
            };
        }).filter(c => c.score >= this.config.minimumScore);

        // Sort by score descending
        correlations.sort((a, b) => b.score - a.score);

        // Store correlations in database
        for (const correlation of correlations.slice(0, 10)) {
            await this.storeCorrelation(alertId, correlation.alert.id, correlation.score, correlation.reason);
        }

        return correlations;
    }

    private calculateCorrelationScore(alert1: any, alert2: any): number {
        let score = 0;

        // Time proximity (max 0.4 points)
        const timeDiff = Math.abs(alert1.firstSeenAt.getTime() - alert2.firstSeenAt.getTime());
        const timeScore = Math.max(0, 1 - (timeDiff / (this.config.timeWindowMinutes * 60 * 1000)));
        score += timeScore * 0.4;

        // Same environment (0.2 points)
        if (alert1.environment === alert2.environment) {
            score += 0.2;
        }

        // Same project (0.2 points)
        if (alert1.project === alert2.project) {
            score += 0.2;
        }

        // Severity correlation (0.1 points)
        if (alert1.severity === alert2.severity) {
            score += 0.1;
        }

        // Status correlation (0.1 points)
        if (alert1.status === alert2.status) {
            score += 0.1;
        }

        return score;
    }

    private determineCorrelationReason(alert1: any, alert2: any, score: number): string {
        const reasons: string[] = [];

        const timeDiff = Math.abs(alert1.firstSeenAt.getTime() - alert2.firstSeenAt.getTime());
        if (timeDiff < 60000) {
            reasons.push('time_proximity');
        }

        if (alert1.environment === alert2.environment && alert1.project === alert2.project) {
            reasons.push('same_service');
        } else if (alert1.environment === alert2.environment) {
            reasons.push('same_environment');
        }

        if (alert1.severity === 'CRITICAL' || alert2.severity === 'CRITICAL') {
            reasons.push('critical_severity');
        }

        if (score > 0.8) {
            reasons.push('high_correlation');
        }

        return reasons.join(', ') || 'general_correlation';
    }

    private async storeCorrelation(primaryAlertId: string, relatedAlertId: string, score: number, reason: string) {
        try {
            await prisma.alertCorrelation.upsert({
                where: {
                    primaryAlertId_relatedAlertId: {
                        primaryAlertId,
                        relatedAlertId,
                    },
                },
                create: {
                    primaryAlertId,
                    relatedAlertId,
                    correlationScore: score,
                    reason,
                },
                update: {
                    correlationScore: score,
                    reason,
                },
            });
        } catch (error) {
            this.logger.warn(`Failed to store correlation: ${error}`);
        }
    }

    async suggestRootCause(alertId: string): Promise<{ rootCauseAlertId: string | null; confidence: number; explanation: string }> {
        const correlations = await this.findCorrelatedAlerts(alertId);

        if (correlations.length === 0) {
            return {
                rootCauseAlertId: null,
                confidence: 0,
                explanation: 'No correlated alerts found',
            };
        }

        // Find earliest alert as potential root cause
        const sortedByTime = [...correlations].sort((a, b) =>
            a.alert.firstSeenAt.getTime() - b.alert.firstSeenAt.getTime()
        );

        const rootCauseCandidate = sortedByTime[0];
        const currentAlert = await prisma.alertGroup.findUnique({ where: { id: alertId } });

        if (!currentAlert) {
            return {
                rootCauseAlertId: null,
                confidence: 0,
                explanation: 'Alert not found',
            };
        }

        // Calculate confidence based on timing and correlation score
        const isEarlier = rootCauseCandidate.alert.firstSeenAt < currentAlert.firstSeenAt;
        const confidence = isEarlier ? rootCauseCandidate.score : rootCauseCandidate.score * 0.7;

        let explanation = '';
        if (isEarlier) {
            const timeDiff = Math.floor((currentAlert.firstSeenAt.getTime() - rootCauseCandidate.alert.firstSeenAt.getTime()) / 1000);
            explanation = `Alert "${rootCauseCandidate.alert.title}" occurred ${timeDiff}s earlier in the same ${rootCauseCandidate.alert.environment} environment`;

            if (rootCauseCandidate.alert.severity === 'CRITICAL') {
                explanation += ' with CRITICAL severity';
            }
        } else {
            explanation = `Highly correlated with "${rootCauseCandidate.alert.title}" (score: ${rootCauseCandidate.score.toFixed(2)})`;
        }

        return {
            rootCauseAlertId: rootCauseCandidate.alert.id,
            confidence,
            explanation,
        };
    }

    async getStoredCorrelations(alertId: string) {
        return prisma.alertCorrelation.findMany({
            where: {
                OR: [
                    { primaryAlertId: alertId },
                    { relatedAlertId: alertId },
                ],
            },
            include: {
                primaryAlert: {
                    select: {
                        id: true,
                        title: true,
                        severity: true,
                        environment: true,
                        firstSeenAt: true,
                    },
                },
                relatedAlert: {
                    select: {
                        id: true,
                        title: true,
                        severity: true,
                        environment: true,
                        firstSeenAt: true,
                    },
                },
            },
            orderBy: {
                correlationScore: 'desc',
            },
        });
    }
}
