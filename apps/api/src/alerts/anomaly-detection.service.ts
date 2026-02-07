import { Injectable, Logger } from '@nestjs/common';
import { prisma, AlertStatus, AlertSeverity } from '@signalcraft/database';
import crypto from 'crypto';
import { AuditService } from '../audit/audit.service';

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
  private readonly windowHours = 24;
  private readonly zScoreThreshold = 3;
  private readonly minVelocity = 5;

  constructor(private readonly auditService: AuditService) {}

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
    return this.detectWorkspaceAnomaliesInternal(workspaceId, { createAlerts: false });
  }

  async detectAndRecordAnomalies(workspaceId: string): Promise<AnomalyAlert[]> {
    return this.detectWorkspaceAnomaliesInternal(workspaceId, { createAlerts: true });
  }

  private async detectWorkspaceAnomaliesInternal(
    workspaceId: string,
    options: { createAlerts: boolean },
  ): Promise<AnomalyAlert[]> {
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
        const { mean, stdDev, currentCount } = await this.computeGroupStats(workspaceId, group.id);
        if (currentCount < this.minVelocity) {
          continue;
        }

        const zScore = stdDev > 0 ? (currentCount - mean) / stdDev : 0;
        if (zScore < this.zScoreThreshold) {
          continue;
        }

        const percentageIncrease = mean > 0 ? ((currentCount - mean) / mean) * 100 : 0;

        anomalies.push({
          alertGroupId: group.id,
          title: group.title,
          severity: group.severity,
          currentVelocity: currentCount,
          baselineVelocity: mean,
          percentageIncrease,
          detectedAt: new Date(),
        });

        if (options.createAlerts) {
          await this.ensureAnomalyAlert(
            workspaceId,
            group.id,
            group.title,
            group.project,
            group.environment,
            {
              currentVelocity: currentCount,
              baselineVelocity: mean,
              zScore,
            },
          );
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
    return this.detectWorkspaceAnomaliesInternal(workspaceId, { createAlerts: false });
  }

  /**
   * Check if a specific alert group is currently in anomaly state
   */
  async isAnomalyActive(workspaceId: string, alertGroupId: string): Promise<boolean> {
    const group = await prisma.alertGroup.findFirst({
      where: { id: alertGroupId, workspaceId },
    });

    if (!group || !group.velocityPerHour) return false;

    const { mean, stdDev, currentCount } = await this.computeGroupStats(workspaceId, alertGroupId);
    if (currentCount < this.minVelocity) return false;
    const zScore = stdDev > 0 ? (currentCount - mean) / stdDev : 0;
    return zScore >= this.zScoreThreshold;
  }

  private async computeGroupStats(workspaceId: string, alertGroupId: string) {
    const { buckets, mean, stdDev, currentCount } = await this.computeBuckets(
      workspaceId,
      alertGroupId,
    );
    const seasonal = await this.computeSeasonalStats(workspaceId, alertGroupId);

    const effectiveMean = seasonal?.mean ?? mean;
    const effectiveStdDev = seasonal?.stdDev ?? stdDev;

    await this.upsertBaseline(workspaceId, alertGroupId, {
      mean: effectiveMean,
      stdDev: effectiveStdDev,
      sampleCount: buckets.length,
      windowHours: this.windowHours,
      seasonalMean: seasonal?.mean ?? null,
      seasonalStdDev: seasonal?.stdDev ?? null,
      seasonalHour: seasonal?.hour ?? null,
      seasonalDays: seasonal?.days ?? null,
    });

    return {
      mean: effectiveMean,
      stdDev: effectiveStdDev,
      currentCount,
      seasonalMean: seasonal?.mean,
      seasonalStdDev: seasonal?.stdDev,
      seasonalHour: seasonal?.hour,
    };
  }

  async getVelocityHistory(workspaceId: string, alertGroupId: string) {
    const { buckets, mean, stdDev, currentCount } = await this.computeBuckets(
      workspaceId,
      alertGroupId,
    );
    const seasonal = await this.computeSeasonalStats(workspaceId, alertGroupId);
    const effectiveMean = seasonal?.mean ?? mean;
    const effectiveStdDev = seasonal?.stdDev ?? stdDev;
    const zScore = effectiveStdDev > 0 ? (currentCount - effectiveMean) / effectiveStdDev : 0;
    return {
      windowHours: this.windowHours,
      mean: effectiveMean,
      stdDev: effectiveStdDev,
      seasonalMean: seasonal?.mean ?? null,
      seasonalStdDev: seasonal?.stdDev ?? null,
      seasonalHour: seasonal?.hour ?? null,
      currentCount,
      zScore,
      buckets,
    };
  }

  private async computeBuckets(workspaceId: string, alertGroupId: string) {
    const since = new Date(Date.now() - this.windowHours * 60 * 60 * 1000);
    const events = await prisma.alertEvent.findMany({
      where: { workspaceId, alertGroupId, occurredAt: { gte: since } },
      select: { occurredAt: true },
    });

    const buckets = new Array(this.windowHours).fill(0);
    for (const event of events) {
      const diffHours = Math.floor((Date.now() - event.occurredAt.getTime()) / (60 * 60 * 1000));
      if (diffHours >= 0 && diffHours < this.windowHours) {
        buckets[this.windowHours - 1 - diffHours] += 1;
      }
    }

    const mean = buckets.reduce((sum, value) => sum + value, 0) / this.windowHours;
    const variance =
      buckets.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / this.windowHours;
    const stdDev = Math.sqrt(variance);
    const currentCount = buckets[this.windowHours - 1] ?? 0;

    return { buckets, mean, stdDev, currentCount };
  }

  private async upsertBaseline(
    workspaceId: string,
    alertGroupId: string,
    baseline: {
      mean: number;
      stdDev: number;
      sampleCount: number;
      windowHours: number;
      seasonalMean: number | null;
      seasonalStdDev: number | null;
      seasonalHour: number | null;
      seasonalDays: number | null;
    },
  ) {
    const metricKey = `alert_events:${alertGroupId}`;
    await prisma.anomalyModel.upsert({
      where: { workspaceId_metricKey: { workspaceId, metricKey } },
      create: {
        workspaceId,
        metricKey,
        baseline,
        lastUpdated: new Date(),
      },
      update: {
        baseline,
        lastUpdated: new Date(),
      },
    });
  }

  private async computeSeasonalStats(workspaceId: string, alertGroupId: string) {
    const lookbackDays = 7;
    const now = new Date();
    const since = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);
    const events = await prisma.alertEvent.findMany({
      where: { workspaceId, alertGroupId, occurredAt: { gte: since } },
      select: { occurredAt: true },
    });

    if (events.length === 0) {
      return null;
    }

    const currentHour = now.getHours();
    const dayBuckets = new Array(lookbackDays).fill(0);
    for (const event of events) {
      const diffDays = Math.floor(
        (now.getTime() - event.occurredAt.getTime()) / (24 * 60 * 60 * 1000),
      );
      if (diffDays >= 0 && diffDays < lookbackDays && event.occurredAt.getHours() === currentHour) {
        dayBuckets[lookbackDays - 1 - diffDays] += 1;
      }
    }

    const mean = dayBuckets.reduce((sum, value) => sum + value, 0) / lookbackDays;
    const variance =
      dayBuckets.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / lookbackDays;
    const stdDev = Math.sqrt(variance);

    return {
      mean,
      stdDev,
      hour: currentHour,
      days: lookbackDays,
    };
  }

  private async ensureAnomalyAlert(
    workspaceId: string,
    alertGroupId: string,
    title: string,
    project: string,
    environment: string,
    stats: { currentVelocity: number; baselineVelocity: number; zScore: number },
  ) {
    const fingerprint = `velocity:${alertGroupId}`;
    const groupKey = this.hashGroupKey(['ANOMALY', project, environment, fingerprint]);

    const existing = await prisma.alertGroup.findFirst({
      where: {
        workspaceId,
        groupKey,
        status: { in: [AlertStatus.OPEN, AlertStatus.ACK] },
      },
    });

    if (existing) {
      return existing;
    }

    const now = new Date();
    const alertTitle = `High Error Velocity Detected: ${title}`;
    const message = `Current: ${stats.currentVelocity.toFixed(1)}/hr · Baseline: ${stats.baselineVelocity.toFixed(
      1,
    )}/hr · z=${stats.zScore.toFixed(2)}`;

    const group = await prisma.alertGroup.create({
      data: {
        workspaceId,
        groupKey,
        title: alertTitle,
        severity: AlertSeverity.LOW,
        environment,
        project,
        status: AlertStatus.OPEN,
        firstSeenAt: now,
        lastSeenAt: now,
        count: 1,
      },
    });

    await prisma.alertEvent.create({
      data: {
        workspaceId,
        alertGroupId: group.id,
        source: 'ANOMALY',
        sourceEventId: `${group.id}:${now.getTime()}`,
        project,
        environment,
        severity: AlertSeverity.LOW,
        fingerprint,
        tagsJson: {
          anomalyType: 'velocity',
          zScore: stats.zScore,
        },
        title: alertTitle,
        message,
        occurredAt: now,
        payloadJson: {},
      },
    });

    await this.logAnomalyAudit(workspaceId, group.id, {
      alertGroupId,
      zScore: stats.zScore,
      currentVelocity: stats.currentVelocity,
      baselineVelocity: stats.baselineVelocity,
    });

    return group;
  }

  private hashGroupKey(parts: string[]) {
    const rawKey = parts.map((value) => value.trim().toLowerCase()).join('|');
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }

  private async logAnomalyAudit(
    workspaceId: string,
    anomalyGroupId: string,
    metadata: Record<string, unknown>,
  ) {
    const fallbackUser = await prisma.user.findFirst({
      where: { workspaceId },
      select: { id: true },
    });
    if (!fallbackUser) {
      return;
    }

    await this.auditService.log({
      workspaceId,
      userId: fallbackUser.id,
      action: 'ANOMALY_DETECTED',
      resourceType: 'AlertGroup',
      resourceId: anomalyGroupId,
      metadata: { ...metadata, actor: 'system' },
    });
  }
}
