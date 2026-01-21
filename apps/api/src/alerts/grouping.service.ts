import { Injectable } from '@nestjs/common';
import crypto from 'crypto';
import { prisma, AlertStatus, AlertSeverity, AlertGroup } from '@signalcraft/database';
import { NormalizedAlert, AlertSeverity as NormalizedSeverity } from '@signalcraft/shared';
import { AnomalyDetectionService } from './anomaly-detection.service';

const severityRank: Record<AlertSeverity, number> = {
  [AlertSeverity.INFO]: 1,
  [AlertSeverity.LOW]: 2,
  [AlertSeverity.MEDIUM]: 3,
  [AlertSeverity.HIGH]: 4,
  [AlertSeverity.CRITICAL]: 5,
};

const normalizeSeverity = (severity: NormalizedSeverity): AlertSeverity => {
  // Assuming NormalizedSeverity might be string or enum, force string comparison safely or cast
  const s = String(severity).toUpperCase();
  switch (s) {
    case 'CRITICAL':
    case 'FATAL':
      return AlertSeverity.CRITICAL;
    case 'HIGH':
    case 'ERROR':
      return AlertSeverity.HIGH;
    case 'MEDIUM':
    case 'MED':
    case 'WARNING':
      return AlertSeverity.MEDIUM;
    case 'LOW':
    case 'SUCCESS':
      return AlertSeverity.LOW;
    case 'INFO':
    case 'DEBUG':
    default:
      return AlertSeverity.INFO;
  }
};

@Injectable()
export class GroupingService {
  private readonly windowMinutes = Number(process.env.GROUPING_WINDOW_MINUTES ?? 60);

  constructor(
    private readonly anomalyDetectionService: AnomalyDetectionService,
  ) { }

  generateGroupKey(alert: NormalizedAlert): string {
    const rawKey = [alert.source, alert.project, alert.environment, alert.fingerprint]
      .map((value) => value.trim().toLowerCase())
      .join('|');

    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }

  async upsertGroup(workspaceId: string, alert: NormalizedAlert): Promise<AlertGroup> {
    const groupKey = this.generateGroupKey(alert);
    const windowStart = new Date(Date.now() - this.windowMinutes * 60_000);

    return prisma.$transaction(async (tx) => {
      const existing = await tx.alertGroup.findFirst({
        where: {
          workspaceId,
          groupKey,
          status: { in: [AlertStatus.OPEN, AlertStatus.ACK] },
          lastSeenAt: { gte: windowStart },
        },
      });

      if (!existing) {
        return tx.alertGroup.create({
          data: {
            workspaceId,
            groupKey,
            title: alert.title,
            severity: normalizeSeverity(alert.severity),
            environment: alert.environment,
            project: alert.project,
            status: AlertStatus.OPEN,
            firstSeenAt: alert.occurredAt,
            lastSeenAt: alert.occurredAt,
            count: 1,
            // Impact Estimation
            userCount: alert.userCount,
            velocityPerHour: null, // Will be calculated on updates
          },
        });
      }

      const existingSeverityRank = this.mapSeverityToRank(existing.severity);
      const incomingSeverityRank = severityRank[alert.severity];

      // Calculate velocity: occurrences per hour since first seen
      const hoursSinceFirstSeen = Math.max(
        (alert.occurredAt.getTime() - existing.firstSeenAt.getTime()) / (1000 * 60 * 60),
        0.1 // Minimum 6 minutes to avoid division issues
      );
      const newVelocity = (existing.count + 1) / hoursSinceFirstSeen;

      // Check for Anomaly (Velocity Spike)
      const isAnomalous = await this.anomalyDetectionService.checkVelocityAnomaly(
        workspaceId,
        existing.id,
        newVelocity
      );

      // Upgrade severity if incoming is higher or if anomalous
      let finalSeverity = existing.severity;
      if (incomingSeverityRank > existingSeverityRank) {
        finalSeverity = normalizeSeverity(alert.severity);
      }

      if (isAnomalous && this.mapSeverityToRank(finalSeverity) < severityRank[AlertSeverity.HIGH]) {
        finalSeverity = AlertSeverity.HIGH; // Auto-escalate to at least HIGH
      }

      // Aggregate user count (take max)
      const updatedUserCount = Math.max(
        existing.userCount ?? 0,
        alert.userCount ?? 0
      ) || null;

      return tx.alertGroup.update({
        where: { id: existing.id },
        data: {
          lastSeenAt: alert.occurredAt,
          count: { increment: 1 },
          severity: finalSeverity,
          // Impact Estimation
          userCount: updatedUserCount,
          velocityPerHour: newVelocity,
        },
      });
    });
  }

  private mapSeverityToRank(severity: string): number {
    const s = severity.toUpperCase();
    switch (s) {
      case 'CRITICAL':
        return severityRank[AlertSeverity.CRITICAL];
      case 'HIGH':
        return severityRank[AlertSeverity.HIGH];
      case 'MED':
      case 'MEDIUM':
        return severityRank[AlertSeverity.MEDIUM];
      case 'LOW':
        return severityRank[AlertSeverity.LOW];
      case 'INFO':
      default:
        return severityRank[AlertSeverity.INFO];
    }
  }
}
