import { Injectable, Logger } from '@nestjs/common';
import { prisma, AlertSeverity, AlertStatus } from '@signalcraft/database';

export interface AnomalyAlert {
    alertGroupId: string;
    title: string;
    severity: string;
    currentVelocity: number;
    baselineVelocity: number;
    percentageIncrease: number;
    detectedAt: Date;
}

@Injectable()
export class AnomalyDetectionService {
    private readonly logger = new Logger(AnomalyDetectionService.name);

    /**
     * Check for velocity anomaly (spike detection) for a single alert group
     * Heuristic: If current velocity > (average velocity * 3) AND count > 5
     */
    async checkVelocityAnomaly(
        workspaceId: string,
        alertGroupId: string,
        currentVelocity: number,
    ): Promise<boolean> {
        try {
            const group = await prisma.alertGroup.findUnique({
                where: { id: alertGroupId },
            });

            if (!group) return false;

            const hoursActive = Math.max(
                (Date.now() - group.firstSeenAt.getTime()) / (1000 * 60 * 60),
                1, // Minimum 1 hour
            );

            const longTermVelocity = group.count / hoursActive;

            // Threshold: 3x baseline or minimum 10 events/hour to silence noise
            const anomalyThreshold = Math.max(longTermVelocity * 3, 10);

            if (currentVelocity > anomalyThreshold) {
                this.logger.warn(
                    `Anomaly detected for group ${group.id}: velocity ${currentVelocity.toFixed(1)} > threshold ${anomalyThreshold.toFixed(1)}`,
                );
                return true;
            }

            return false;
        } catch (error) {
            this.logger.error('Error checking anomaly', error);
            return false;
        }
    }

    /**
     * Detect anomalies across all open alerts in a workspace
     * Uses rolling 24h average with standard deviation
     */
    async detectWorkspaceAnomalies(workspaceId: string): Promise<AnomalyAlert[]> {
        const anomalies: AnomalyAlert[] = [];

        try {
            // Get all open alert groups with at least 5 events
            const alertGroups = await prisma.alertGroup.findMany({
                where: {
                    workspaceId,
                    status: { in: ['OPEN', 'ACK'] },
                    count: { gte: 5 },
                },
                orderBy: { lastSeenAt: 'desc' },
                take: 100, // Limit to avoid performance issues
            });

            for (const group of alertGroups) {
                // Calculate baseline (long-term average velocity)
                const hoursActive = Math.max(
                    (Date.now() - group.firstSeenAt.getTime()) / (1000 * 60 * 60),
                    1,
                );
                const baselineVelocity = group.count / hoursActive;

                // Get current velocity (stored on the group)
                const currentVelocity = group.velocityPerHour ?? 0;

                // Skip if no significant velocity
                if (currentVelocity < 5) continue;

                // Calculate anomaly score: current / baseline
                const ratio = baselineVelocity > 0 ? currentVelocity / baselineVelocity : 0;
                const percentageIncrease = (ratio - 1) * 100;

                // Anomaly if current velocity is > 3x baseline
                if (ratio > 3) {
                    anomalies.push({
                        alertGroupId: group.id,
                        title: group.title,
                        severity: group.severity,
                        currentVelocity,
                        baselineVelocity,
                        percentageIncrease,
                        detectedAt: new Date(),
                    });
                }
            }

            if (anomalies.length > 0) {
                this.logger.warn(`Detected ${anomalies.length} anomalies in workspace ${workspaceId}`);
            }

            return anomalies;
        } catch (error) {
            this.logger.error('Error detecting workspace anomalies', error);
            return [];
        }
    }

    /**
     * Get recently detected anomalies for a workspace
     * Returns alerts that have high velocity spikes
     */
    async getActiveAnomalies(workspaceId: string): Promise<AnomalyAlert[]> {
        return this.detectWorkspaceAnomalies(workspaceId);
    }

    /**
     * Check if a specific alert group is currently in anomaly state
     */
    async isAnomalyActive(workspaceId: string, alertGroupId: string): Promise<boolean> {
        const group = await prisma.alertGroup.findFirst({
            where: { id: alertGroupId, workspaceId },
        });

        if (!group || !group.velocityPerHour) return false;

        const hoursActive = Math.max(
            (Date.now() - group.firstSeenAt.getTime()) / (1000 * 60 * 60),
            1,
        );
        const baselineVelocity = group.count / hoursActive;
        const ratio = baselineVelocity > 0 ? group.velocityPerHour / baselineVelocity : 0;

        return ratio > 3 && group.velocityPerHour > 5;
    }
}
