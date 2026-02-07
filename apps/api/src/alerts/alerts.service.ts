import { Injectable, Inject, forwardRef } from '@nestjs/common';
import {
  prisma,
  AlertSeverity,
  Prisma,
  AlertStatus,
  IncidentTimelineEventType,
  IntegrationType,
  NotificationTarget,
} from '@signalcraft/database';
import { NormalizedAlert } from '@signalcraft/shared';
import { AiService } from '../ai/ai.service';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { EventsGateway } from '../common/websocket/events.gateway';
import { AuditService } from '../audit/audit.service';
import { JiraService } from '../integrations/jira.service';
import { ExternalMappingsService } from '../sync/external-mappings.service';
import { SyncManagerService } from '../sync/sync-manager.service';
import { NotificationLogService } from '../notifications/notification-log.service';
import { SlackNotificationService } from '../notifications/slack-notification.service';
import { SlackService } from '../integrations/slack/slack.service';
import { IncidentRole } from '@signalcraft/database';
import { ChangeEventsService } from '../change-events/change-events.service';

export interface AlertGroupFilters {
  status?: AlertStatus[];
  severity?: AlertSeverity[];
  environment?: string[];
  project?: string[];
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface SortOptions {
  sortBy: 'lastSeenAt' | 'firstSeenAt' | 'severity' | 'count' | 'status';
  sortOrder: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

@Injectable()
export class AlertsService {
  constructor(
    private readonly aiService: AiService,
    private readonly anomalyDetectionService: AnomalyDetectionService,
    private readonly eventsGateway: EventsGateway,
    private readonly auditService: AuditService,
    private readonly jiraService: JiraService,
    private readonly slackService: SlackService,
    private readonly changeEventsService: ChangeEventsService,
    @Inject(forwardRef(() => SlackNotificationService))
    private readonly slackNotificationService: SlackNotificationService,
    private readonly externalMappingsService: ExternalMappingsService,
    private readonly syncManager: SyncManagerService,
    private readonly notificationLogService: NotificationLogService,
  ) {}

  async findSimilarResolvedAlerts(
    workspaceId: string,
    alertGroup: { title: string; project: string },
    options: { includeOtherProjects?: boolean; limit?: number } = {},
  ) {
    // Find resolved alerts with the same title or in the same project with similar keywords
    // For now, we do basic matching on exact title or specific error keywords
    // In a real app, this would use vector embeddings or full-text search
    const where: Prisma.AlertGroupWhereInput = {
      workspaceId,
      status: AlertStatus.RESOLVED,
      resolutionNotes: { not: null },
      OR: [{ title: { contains: alertGroup.title } }, { title: { equals: alertGroup.title } }],
    };

    if (!options.includeOtherProjects) {
      where.project = alertGroup.project;
    }

    return prisma.alertGroup.findMany({
      where,
      take: options.limit ?? 5,
      orderBy: { resolvedAt: 'desc' },
      select: {
        title: true,
        resolutionNotes: true,
        lastResolvedBy: true,
        project: true,
        environment: true,
      },
    });
  }

  async getAiSuggestion(workspaceId: string, groupId: string) {
    const group = await prisma.alertGroup.findUnique({
      where: { id: groupId, workspaceId },
      include: {
        release: true,
        alertEvents: { orderBy: { occurredAt: 'desc' }, take: 5 },
      },
    });

    if (!group) return null;

    if (!this.aiService.isEnabled()) {
      return { enabled: false, suggestion: null };
    }

    const pastResolutions = await this.findSimilarResolvedAlerts(
      workspaceId,
      {
        title: group.title,
        project: group.project,
      },
      { includeOtherProjects: true, limit: 6 },
    );

    if (pastResolutions.length === 0) {
      return { enabled: true, suggestion: null };
    }

    const logContext = this.buildLogContext(group.alertEvents, 3);
    const deploymentContext = await this.buildDeploymentContext(workspaceId, group.release);
    const changeEvents = await this.changeEventsService.getChangeEventsForAlertGroup(
      workspaceId,
      groupId,
    );
    const changeEventsContext = this.formatChangeEvents(changeEvents ?? [], 5);
    const crossProjectNote = this.buildCrossProjectNote(pastResolutions, group.project);

    const descriptionParts = [
      `Severity: ${group.severity}`,
      `Status: ${group.status}`,
      `Count: ${group.count}`,
    ];
    if (group.release?.version) {
      descriptionParts.push(`Suspect Release: ${group.release.version}`);
    }

    const suggestion = await this.aiService.generateResolutionSuggestion(
      {
        title: group.title,
        description: descriptionParts.join(', '),
        environment: group.environment,
        project: group.project,
      },
      pastResolutions,
      {
        recentLogs: logContext,
        deploymentContext,
        changeEvents: changeEventsContext,
        crossProjectNote,
      },
    );

    return { enabled: true, suggestion };
  }

  async generateRunbookDraft(workspaceId: string, groupId: string) {
    const group = await prisma.alertGroup.findUnique({
      where: { id: groupId, workspaceId },
      include: {
        release: true,
        alertEvents: { orderBy: { occurredAt: 'desc' }, take: 5 },
      },
    });

    if (!group) {
      return null;
    }

    if (!this.aiService.isEnabled()) {
      return { enabled: false, draft: null };
    }

    const timeline = await prisma.incidentTimelineEntry.findMany({
      where: { alertGroupId: groupId },
      orderBy: { occurredAt: 'asc' },
      take: 10,
    });

    const pastResolutions = await this.findSimilarResolvedAlerts(
      workspaceId,
      {
        title: group.title,
        project: group.project,
      },
      { includeOtherProjects: true, limit: 8 },
    );

    const deploymentContext = await this.buildDeploymentContext(workspaceId, group.release);

    const recentEvents = group.alertEvents
      .map((event) => `- [${event.occurredAt.toISOString()}] ${event.title}: ${event.message}`)
      .join('\n');

    const timelineSummary = timeline
      .map(
        (entry: { occurredAt: Date; title: string; message: string | null }) =>
          `- [${entry.occurredAt.toISOString()}] ${entry.title}${entry.message ? ` — ${entry.message}` : ''}`,
      )
      .join('\n');

    const resolutionExamples = pastResolutions
      .filter((res) => res.resolutionNotes)
      .map((res, index) => {
        const projectLabel = res.project
          ? ` [${res.project}${res.environment ? `/${res.environment}` : ''}]`
          : '';
        return `${index + 1}. ${this.truncateText(res.resolutionNotes || '', 320)}${projectLabel}`;
      })
      .join('\n');

    const logSnippets = this.buildLogContext(group.alertEvents, 3);

    const changeEvents = await this.changeEventsService.getChangeEventsForAlertGroup(
      workspaceId,
      groupId,
    );
    const changeEventsSummary = this.formatChangeEvents(changeEvents ?? [], 6);

    const prompt = `You are an experienced SRE. Draft a concise, actionable runbook for the incident below.

INCIDENT SUMMARY:
- Title: ${group.title}
- Severity: ${group.severity}
- Environment: ${group.environment}
- Project: ${group.project}
- Current Status: ${group.status}
- Recurrence: ${group.count} occurrence${group.count === 1 ? '' : 's'}

DEPLOYMENT CONTEXT:
${deploymentContext || 'None'}

RECENT ALERT EVENTS:
${recentEvents || 'None'}

RECENT LOG CONTEXT:
${logSnippets || 'None'}

CHANGE EVENTS:
${changeEventsSummary || 'None'}

INCIDENT TIMELINE:
${timelineSummary || 'None'}

PAST RESOLUTION NOTES:
${resolutionExamples || 'None'}

OUTPUT FORMAT (Markdown):
## Overview
## Impact
## Likely Causes
## Immediate Mitigations
## Verification Steps
## Rollback/Recovery
## Long-term Fixes
## References

Keep it short but actionable, include commands/queries when relevant.`;

    const draft = await this.aiService.generateContent(prompt);
    return { enabled: true, draft };
  }

  private buildLogContext(
    alertEvents: Array<{
      occurredAt: Date;
      title: string;
      message: string;
      payloadJson: Prisma.JsonValue;
    }>,
    limit = 3,
  ) {
    if (!alertEvents || alertEvents.length === 0) {
      return 'None';
    }

    return alertEvents
      .slice(0, limit)
      .map((event) => {
        const message = this.truncateText(event.message || '', 200);
        const payload = event.payloadJson
          ? this.truncateText(JSON.stringify(event.payloadJson), 320)
          : '';
        const details = [message, payload ? `payload: ${payload}` : null]
          .filter(Boolean)
          .join(' | ');
        return `- [${event.occurredAt.toISOString()}] ${event.title}: ${details || 'No message'}`;
      })
      .join('\n');
  }

  private async buildDeploymentContext(
    workspaceId: string,
    release: {
      version: string;
      environment: string;
      project: string;
      deployedAt: Date;
      commitSha?: string | null;
    } | null,
  ) {
    if (!release) return 'None';

    const previousRelease = await prisma.release.findFirst({
      where: {
        workspaceId,
        environment: release.environment,
        project: release.project,
        deployedAt: { lt: release.deployedAt },
      },
      orderBy: { deployedAt: 'desc' },
      select: { version: true, commitSha: true, deployedAt: true },
    });

    const lines = [
      `Release ${release.version} (${release.environment}) for ${release.project} at ${release.deployedAt.toISOString()}`,
      `Commit: ${release.commitSha ?? 'Unknown'}`,
    ];

    if (previousRelease) {
      lines.push(
        `Previous: ${previousRelease.version} at ${previousRelease.deployedAt.toISOString()}${
          previousRelease.commitSha ? ` (commit ${previousRelease.commitSha})` : ''
        }`,
      );
    }

    if (release.commitSha && previousRelease?.commitSha) {
      lines.push(`Commit range: ${previousRelease.commitSha}..${release.commitSha}`);
    }

    return lines.join('\n');
  }

  private formatChangeEvents(
    changeEvents: Array<{
      timestamp: Date;
      type: string;
      source: string;
      title?: string | null;
      actor?: string | null;
      details?: Prisma.JsonValue | null;
    }>,
    limit = 5,
  ) {
    if (!changeEvents || changeEvents.length === 0) {
      return 'None';
    }

    return changeEvents
      .slice(0, limit)
      .map((event) => {
        const title = event.title ? ` ${event.title}` : '';
        const actor = event.actor ? ` by ${event.actor}` : '';
        const details = event.details ? this.truncateText(JSON.stringify(event.details), 240) : '';
        const detailsSuffix = details ? ` - ${details}` : '';
        return `- [${event.timestamp.toISOString()}] ${event.type}${title} (${event.source})${actor}${detailsSuffix}`;
      })
      .join('\n');
  }

  private buildCrossProjectNote(
    pastResolutions: Array<{ project?: string | null }>,
    currentProject: string,
  ) {
    const projects = new Set(
      pastResolutions
        .map((res) => res.project)
        .filter((project): project is string => Boolean(project && project !== currentProject)),
    );

    if (projects.size === 0) return undefined;

    return `Similar resolved alerts were found in other projects (${[...projects].join(
      ', ',
    )}). Use those fixes as guidance, but adapt them to ${currentProject}.`;
  }

  private truncateText(value: string, maxLength: number) {
    if (!value) return '';
    if (value.length <= maxLength) return value;
    const clipped = value.slice(0, Math.max(0, maxLength - 3));
    return `${clipped}...`;
  }

  async isDuplicate(workspaceId: string, sourceEventId: string) {
    const existing = await prisma.alertEvent.findFirst({
      where: { workspaceId, sourceEventId },
      select: { id: true },
    });
    return Boolean(existing);
  }

  async saveAlertEvent(
    workspaceId: string,
    alert: NormalizedAlert,
    payload: Record<string, unknown>,
    alertGroupId: string,
  ) {
    const event = await prisma.alertEvent.create({
      data: {
        workspaceId,
        alertGroupId,
        source: alert.source,
        sourceEventId: alert.sourceEventId,
        project: alert.project,
        environment: alert.environment,
        severity: this.mapSeverity(alert.severity),
        fingerprint: alert.fingerprint,
        tagsJson: alert.tags as Prisma.InputJsonValue,
        title: alert.title,
        message: alert.description,
        occurredAt: alert.occurredAt,
        payloadJson: payload as Prisma.InputJsonValue,
      },
    });

    // Extract and save breadcrumbs from Sentry payload
    await this.extractAndSaveBreadcrumbs(event.id, payload);

    // Emit real-time event
    this.eventsGateway.emitToWorkspace(workspaceId, 'alert.created', event);

    return event;
  }

  /**
   * Extract breadcrumbs from Sentry payload and save to database
   */
  private async extractAndSaveBreadcrumbs(
    alertEventId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      // Sentry breadcrumbs can be in various locations
      const eventData = (this.getNestedObject(payload, 'event') ||
        this.getNestedObject(payload, 'data.event') ||
        payload) as Record<string, unknown>;

      const breadcrumbsData =
        this.getNestedObject(eventData as Record<string, unknown>, 'breadcrumbs.values') ||
        this.getNestedObject(eventData as Record<string, unknown>, 'breadcrumbs') ||
        this.getNestedObject(payload, 'breadcrumbs.values') ||
        this.getNestedObject(payload, 'breadcrumbs') ||
        [];

      if (!Array.isArray(breadcrumbsData) || breadcrumbsData.length === 0) {
        return;
      }

      // Limit to last 50 breadcrumbs to avoid storage issues
      const breadcrumbs = breadcrumbsData.slice(-50);

      interface BreadcrumbData {
        type?: string;
        category?: string;
        message?: string;
        data?: Record<string, unknown> & { message?: string };
        level?: string;
        timestamp?: number | string;
      }
      const breadcrumbRecords = breadcrumbs.map((bc: BreadcrumbData) => ({
        alertEventId,
        type: String(bc.type || 'default'),
        category: bc.category ? String(bc.category) : null,
        message: String(bc.message || bc.data?.message || ''),
        level: String(bc.level || 'info'),
        data: (bc.data ?? undefined) as Prisma.InputJsonValue | undefined,
        timestamp: bc.timestamp
          ? new Date(typeof bc.timestamp === 'number' ? bc.timestamp * 1000 : bc.timestamp)
          : new Date(),
      }));

      if (breadcrumbRecords.length > 0) {
        await prisma.breadcrumb.createMany({
          data: breadcrumbRecords,
        });
      }
    } catch (error) {
      // Don't fail alert processing if breadcrumb extraction fails
      console.error('Failed to extract breadcrumbs:', error);
    }
  }

  /**
   * Safely get nested object property
   */
  private getNestedObject(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key) => {
      return current && typeof current === 'object'
        ? (current as Record<string, unknown>)[key]
        : undefined;
    }, obj as unknown);
  }

  async listAlertGroups(
    workspaceId: string,
    filters: AlertGroupFilters = {},
    pagination: PaginationOptions = { page: 1, limit: 20 },
    sort: SortOptions = { sortBy: 'lastSeenAt', sortOrder: 'desc' },
  ): Promise<PaginatedResult<Prisma.AlertGroupGetPayload<{ include: { assignee: true } }>>> {
    const where: Prisma.AlertGroupWhereInput = {
      workspaceId,
    };

    // Apply filters
    if (filters.status?.length) {
      where.status = { in: filters.status };
    }
    if (filters.severity?.length) {
      where.severity = { in: filters.severity };
    }
    if (filters.environment?.length) {
      where.environment = { in: filters.environment };
    }
    if (filters.project?.length) {
      where.project = { in: filters.project };
    }
    if (filters.search) {
      where.title = { contains: filters.search, mode: 'insensitive' };
    }
    if (filters.startDate) {
      where.lastSeenAt = { ...(where.lastSeenAt as object), gte: filters.startDate };
    }
    if (filters.endDate) {
      where.lastSeenAt = { ...(where.lastSeenAt as object), lte: filters.endDate };
    }

    // Build orderBy
    const orderBy: Prisma.AlertGroupOrderByWithRelationInput = {
      [sort.sortBy]: sort.sortOrder,
    };

    // Get total count
    const total = await prisma.alertGroup.count({ where });

    // Calculate pagination
    const skip = (pagination.page - 1) * pagination.limit;
    const totalPages = Math.ceil(total / pagination.limit);

    // Get data
    const data = await prisma.alertGroup.findMany({
      where,
      orderBy,
      skip,
      take: pagination.limit,
      include: {
        assignee: true,
      },
    });

    return {
      data,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrevious: pagination.page > 1,
    };
  }

  /**
   * Get detailed alert group with events and notification history
   */
  async getAlertGroupDetail(workspaceId: string, groupId: string) {
    const group = await prisma.alertGroup.findFirst({
      where: { id: groupId, workspaceId },
      include: {
        assignee: true,
        release: true,
        alertEvents: {
          orderBy: { occurredAt: 'desc' },
          take: 50,
        },
        notifications: {
          orderBy: { sentAt: 'desc' },
          take: 20,
        },
        incidentRoleAssignments: {
          include: { user: true },
        },
      },
    });

    if (!group) return null;

    const isAnomalous = await this.anomalyDetectionService.checkVelocityAnomaly(
      workspaceId,
      group.id,
      group.velocityPerHour || 0,
    );

    return { ...group, isAnomalous };
  }

  async listIncidentRoles(workspaceId: string, groupId: string) {
    const assignments = await prisma.incidentRoleAssignment.findMany({
      where: { alertGroupId: groupId, alertGroup: { workspaceId } },
      include: { user: true },
    });
    return assignments;
  }

  async assignIncidentRole(
    workspaceId: string,
    groupId: string,
    role: IncidentRole,
    userId: string,
  ) {
    const alertGroup = await prisma.alertGroup.findFirst({
      where: { id: groupId, workspaceId },
      select: { id: true },
    });
    if (!alertGroup) {
      return null;
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, workspaceId },
      select: { id: true },
    });
    if (!user) {
      return null;
    }

    const assignment = await prisma.incidentRoleAssignment.upsert({
      where: { alertGroupId_role: { alertGroupId: groupId, role } },
      create: {
        alertGroupId: groupId,
        userId,
        role,
      },
      update: { userId },
      include: { user: true },
    });

    return assignment;
  }

  async removeIncidentRole(workspaceId: string, groupId: string, role: IncidentRole) {
    const existing = await prisma.incidentRoleAssignment.findFirst({
      where: { alertGroupId: groupId, role, alertGroup: { workspaceId } },
      select: { id: true },
    });
    if (!existing) {
      return null;
    }

    await prisma.incidentRoleAssignment.delete({ where: { id: existing.id } });
    return { success: true };
  }

  /**
   * Get filter options (unique values for dropdowns)
   */
  async getFilterOptions(workspaceId: string) {
    const [environments, projects] = await Promise.all([
      prisma.alertGroup.findMany({
        where: { workspaceId },
        select: { environment: true },
        distinct: ['environment'],
      }),
      prisma.alertGroup.findMany({
        where: { workspaceId },
        select: { project: true },
        distinct: ['project'],
      }),
    ]);

    return {
      environments: environments.map((e) => e.environment),
      projects: projects.map((p) => p.project),
      statuses: Object.values(AlertStatus),
      severities: Object.values(AlertSeverity),
    };
  }

  async listGroups(workspaceId: string, status?: string) {
    return prisma.alertGroup.findMany({
      where: {
        workspaceId,
        status: this.normalizeStatus(status),
      },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  async getGroup(workspaceId: string, groupId: string) {
    return prisma.alertGroup.findFirst({
      where: { id: groupId, workspaceId },
    });
  }

  async listEvents(workspaceId: string, groupId: string) {
    return prisma.alertEvent.findMany({
      where: { workspaceId, alertGroupId: groupId },
      orderBy: { occurredAt: 'desc' },
    });
  }

  async getAnomalies(workspaceId: string) {
    return this.anomalyDetectionService.getActiveAnomalies(workspaceId);
  }

  async getAnomalyHistory(workspaceId: string, groupId: string) {
    const group = await prisma.alertGroup.findFirst({
      where: { id: groupId, workspaceId },
      select: { id: true },
    });
    if (!group) {
      return null;
    }
    return this.anomalyDetectionService.getVelocityHistory(workspaceId, groupId);
  }

  async getSilenceIntelligence(workspaceId: string, groupId: string) {
    const group = await prisma.alertGroup.findFirst({
      where: { id: groupId, workspaceId },
      select: { id: true, title: true, project: true, environment: true },
    });

    if (!group) {
      return null;
    }

    const snoozeLogs = await prisma.auditLog.findMany({
      where: {
        workspaceId,
        action: 'SNOOZE_ALERT',
        resourceType: 'AlertGroup',
        resourceId: groupId,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    if (snoozeLogs.length < 3) {
      return {
        available: false,
        message: 'Not enough snooze history to suggest an auto-snooze pattern yet.',
        totalSnoozes: snoozeLogs.length,
      };
    }

    const dayCounts = new Array(7).fill(0);
    const hourCounts = new Array(24).fill(0);
    const durations: number[] = [];

    for (const log of snoozeLogs) {
      const createdAt = log.createdAt;
      dayCounts[createdAt.getDay()] += 1;
      hourCounts[createdAt.getHours()] += 1;
      const duration = (log.metadata as { durationMinutes?: number } | null)?.durationMinutes;
      if (typeof duration === 'number' && Number.isFinite(duration)) {
        durations.push(duration);
      }
    }

    const total = snoozeLogs.length;
    const topDay = dayCounts.reduce(
      (acc, count, index) => (count > acc.count ? { index, count } : acc),
      { index: 0, count: 0 },
    );
    const topHour = hourCounts.reduce(
      (acc, count, index) => (count > acc.count ? { hour: index, count } : acc),
      { hour: 0, count: 0 },
    );

    const confidence = Math.min(1, (topDay.count / total + topHour.count / total) / 2);
    const avgDuration =
      durations.length > 0
        ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
        : 60;

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const suggestedWindow = {
      dayOfWeek: topDay.index,
      dayName: dayNames[topDay.index],
      startHour: topHour.hour,
      endHour: (topHour.hour + 1) % 24,
      durationMinutes: avgDuration,
    };

    return {
      available: true,
      totalSnoozes: total,
      topDay: { ...topDay, name: dayNames[topDay.index] },
      topHour,
      confidence,
      suggestedWindow,
      suggestedRule: {
        name: `Auto-snooze ${group.project} ${group.environment}`,
        conditions: {
          all: [
            { field: 'project', operator: 'equals', value: group.project },
            { field: 'environment', operator: 'equals', value: group.environment },
          ],
        },
        snoozeMinutes: avgDuration,
        schedule: {
          dayOfWeek: topDay.index,
          startHour: topHour.hour,
          endHour: (topHour.hour + 1) % 24,
        },
      },
    };
  }

  async getBreadcrumbs(workspaceId: string, groupId: string) {
    // Get the most recent event for this alert group
    const latestEvent = await prisma.alertEvent.findFirst({
      where: { workspaceId, alertGroupId: groupId },
      orderBy: { occurredAt: 'desc' },
    });

    if (!latestEvent) {
      return [];
    }

    // Get breadcrumbs for the latest event
    return prisma.breadcrumb.findMany({
      where: { alertEventId: latestEvent.id },
      orderBy: { timestamp: 'asc' },
    });
  }

  /**
   * Acknowledge an alert group
   */
  async acknowledgeAlert(
    workspaceId: string,
    groupId: string,
    userId?: string,
    source: string = 'system',
  ) {
    const alert = await prisma.alertGroup.findFirst({
      where: { id: groupId, workspaceId },
      include: { assignee: true },
    });

    if (!alert) {
      return null;
    }

    if (alert.status === AlertStatus.ACK || alert.status === AlertStatus.RESOLVED) {
      return alert;
    }

    const updated = await prisma.alertGroup.update({
      where: { id: groupId },
      data: {
        status: AlertStatus.ACK,
        assigneeUserId: userId ?? alert.assigneeUserId,
      },
    });

    if (userId) {
      await this.auditService.log({
        workspaceId,
        userId,
        action: 'ACKNOWLEDGE_ALERT',
        resourceType: 'AlertGroup',
        resourceId: groupId,
        metadata: { title: alert.title },
      });
    }

    await this.createTimelineEntry(groupId, {
      type: IncidentTimelineEventType.ALERT_ACKED,
      title: 'Alert acknowledged',
      message: userId ? `Acknowledged by ${userId}` : undefined,
      source,
    });

    await this.postSlackStatusUpdate(workspaceId, groupId);

    await this.syncManager.handleAlertStatusChange({
      workspaceId,
      alertGroupId: groupId,
      status: AlertStatus.ACK,
      source,
    });

    return updated;
  }

  /**
   * Resolve an alert group with optional resolution notes and resolver identity
   */
  async resolveAlert(
    workspaceId: string,
    groupId: string,
    resolutionNotes?: string,
    resolvedBy?: string,
    source: string = 'system',
  ) {
    const alert = await prisma.alertGroup.findFirst({
      where: { id: groupId, workspaceId },
    });

    if (!alert) {
      return null;
    }

    if (alert.status === AlertStatus.RESOLVED) {
      return alert;
    }

    const resolvedAt = new Date();

    // Calculate resolution time
    const resolutionMinutes = Math.round(
      (resolvedAt.getTime() - alert.lastSeenAt.getTime()) / (1000 * 60),
    );

    // Calculate rolling average resolution time
    const newAvgResolution = alert.avgResolutionMins
      ? Math.round((alert.avgResolutionMins + resolutionMinutes) / 2)
      : resolutionMinutes;

    const updated = await prisma.alertGroup.update({
      where: { id: groupId },
      data: {
        status: AlertStatus.RESOLVED,
        resolvedAt,
        resolutionNotes: resolutionNotes || alert.resolutionNotes,
        lastResolvedBy: resolvedBy || alert.lastResolvedBy,
        avgResolutionMins: newAvgResolution,
      },
    });

    if (resolvedBy) {
      // Find the DB user by resolvedBy email or ID?
      // Alerts controller passes DB user ID as resolvedBy.
      await this.auditService.log({
        workspaceId,
        userId: resolvedBy,
        action: 'RESOLVE_ALERT',
        resourceType: 'AlertGroup',
        resourceId: groupId,
        metadata: { title: alert.title, resolutionMinutes },
      });
    }

    await this.createTimelineEntry(groupId, {
      type: IncidentTimelineEventType.ALERT_RESOLVED,
      title: 'Alert resolved',
      message: resolvedBy ? `Resolved by ${resolvedBy}` : undefined,
      source,
      metadata: { resolutionNotes: resolutionNotes ?? null },
    });

    await this.postSlackStatusUpdate(workspaceId, groupId);

    await this.syncManager.handleAlertStatusChange({
      workspaceId,
      alertGroupId: groupId,
      status: AlertStatus.RESOLVED,
      source,
    });

    return updated;
  }

  async resolveAlertBySourceEventId(
    workspaceId: string,
    sourceEventId: string,
    source: string,
    resolutionNotes?: string,
  ) {
    const event = await prisma.alertEvent.findFirst({
      where: { workspaceId, sourceEventId },
      include: { alertGroup: true },
    });

    if (!event?.alertGroup) {
      return null;
    }

    return this.resolveAlert(workspaceId, event.alertGroup.id, resolutionNotes, undefined, source);
  }

  async createJiraTicket(
    workspaceId: string,
    groupId: string,
    options: { notifySlack?: boolean } = {},
  ) {
    const result = await this.jiraService.createIssueForAlert(workspaceId, groupId);

    if (result.success && result.issueKey) {
      await this.externalMappingsService.upsertMapping({
        alertGroupId: groupId,
        integrationType: IntegrationType.JIRA,
        externalId: result.issueKey,
        metadata: {
          source: 'signalcraft',
        },
      });
    }

    if (result.success && options.notifySlack !== false) {
      try {
        await this.slackNotificationService.sendJiraTicketNotification(
          workspaceId,
          groupId,
          result.issueKey ?? null,
          result.issueUrl ?? null,
        );
      } catch (error) {
        console.warn('Failed to post Jira ticket to Slack', error);
      }
    }

    if (result.success) {
      await this.createTimelineEntry(groupId, {
        type: IncidentTimelineEventType.JIRA_TICKET_CREATED,
        title: 'Jira ticket created',
        message: result.issueKey ?? undefined,
        source: 'jira',
        metadata: { issueUrl: result.issueUrl ?? null },
      });
    }

    return result;
  }

  private async postSlackStatusUpdate(workspaceId: string, alertGroupId: string) {
    const channelId = await this.notificationLogService.findLatestTargetRef(
      workspaceId,
      alertGroupId,
      NotificationTarget.SLACK,
    );

    if (!channelId) {
      return;
    }

    await this.slackNotificationService.postStatusUpdate(workspaceId, channelId, alertGroupId);
  }

  /**
   * Snooze an alert group for a duration
   */
  async snoozeAlert(workspaceId: string, groupId: string, durationMinutes = 60, userId?: string) {
    const alert = await prisma.alertGroup.findFirst({
      where: { id: groupId, workspaceId },
    });

    if (!alert) {
      return null;
    }

    const snoozeUntil = new Date(Date.now() + durationMinutes * 60 * 1000);

    const updated = await prisma.alertGroup.update({
      where: { id: groupId },
      data: {
        status: AlertStatus.SNOOZED,
        snoozeUntil,
      },
    });

    if (userId) {
      await this.auditService.log({
        workspaceId,
        userId,
        action: 'SNOOZE_ALERT',
        resourceType: 'AlertGroup',
        resourceId: groupId,
        metadata: { title: alert.title, durationMinutes },
      });
    }

    this.eventsGateway.emitToWorkspace(workspaceId, 'alert.updated', updated);
    await this.createTimelineEntry(groupId, {
      type: IncidentTimelineEventType.ALERT_SNOOZED,
      title: 'Alert snoozed',
      message: `${durationMinutes} minutes`,
      source: 'system',
      metadata: { snoozeUntil },
    });
    return updated;
  }

  /**
   * Update alert group (assignee, runbook, notes)
   */
  async updateAlertGroup(
    workspaceId: string,
    groupId: string,
    data: {
      assigneeUserId?: string | null;
      runbookUrl?: string | null;
      runbookMarkdown?: string | null;
      conferenceUrl?: string | null;
    },
  ) {
    const alert = await prisma.alertGroup.findFirst({
      where: { id: groupId, workspaceId },
    });

    if (!alert) {
      return null;
    }

    const updated = await prisma.alertGroup.update({
      where: { id: groupId },
      data: {
        ...(data.assigneeUserId !== undefined && { assigneeUserId: data.assigneeUserId }),
        ...(data.runbookUrl !== undefined && { runbookUrl: data.runbookUrl }),
        ...(data.runbookMarkdown !== undefined && { runbookMarkdown: data.runbookMarkdown }),
        ...(data.conferenceUrl !== undefined && { conferenceUrl: data.conferenceUrl }),
      },
    });
    this.eventsGateway.emitToWorkspace(workspaceId, 'alert.updated', updated);
    if (data.conferenceUrl !== undefined) {
      await this.createTimelineEntry(groupId, {
        type: IncidentTimelineEventType.CONFERENCE_LINK_SET,
        title: data.conferenceUrl ? 'Conference link set' : 'Conference link cleared',
        message: data.conferenceUrl ?? undefined,
        source: 'system',
      });
    }
    return updated;
  }

  async createWarRoom(
    workspaceId: string,
    groupId: string,
    options: { conferenceUrl?: string; actorEmail?: string } = {},
  ) {
    const alert = await prisma.alertGroup.findFirst({
      where: { id: groupId, workspaceId },
    });
    if (!alert) {
      return null;
    }

    if (alert.warRoomChannelId) {
      return {
        channelId: alert.warRoomChannelId,
        channelName: alert.warRoomChannelName,
        conferenceUrl: alert.conferenceUrl,
      };
    }

    const channelName = this.buildWarRoomChannelName(alert);
    const topicParts = [`Incident: ${alert.title}`];
    const conferenceUrl = options.conferenceUrl ?? alert.conferenceUrl;
    if (conferenceUrl) {
      topicParts.push(`Bridge: ${conferenceUrl}`);
    }

    let assigneeEmail: string | undefined;
    if (alert.assigneeUserId) {
      const assignee = await prisma.user.findUnique({
        where: { id: alert.assigneeUserId },
        select: { email: true },
      });
      assigneeEmail = assignee?.email;
    }

    const inviteEmails = [options.actorEmail, assigneeEmail]
      .filter(Boolean)
      .map((value) => String(value));

    const result = await this.slackService.createWarRoomChannel(workspaceId, {
      name: channelName,
      topic: topicParts.join(' | '),
      inviteEmails,
    });

    const updated = await prisma.alertGroup.update({
      where: { id: groupId },
      data: {
        warRoomChannelId: result.channelId,
        warRoomChannelName: result.channelName,
        conferenceUrl: conferenceUrl ?? undefined,
      },
    });

    this.eventsGateway.emitToWorkspace(workspaceId, 'alert.updated', updated);

    await this.createTimelineEntry(groupId, {
      type: IncidentTimelineEventType.WAR_ROOM_CREATED,
      title: 'War room created',
      message: result.channelName,
      source: 'slack',
      metadata: { channelId: result.channelId },
    });

    return {
      channelId: result.channelId,
      channelName: result.channelName,
      conferenceUrl: conferenceUrl ?? null,
    };
  }

  private buildWarRoomChannelName(alert: { id: string; title: string }) {
    const base = alert.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const shortId = alert.id.slice(0, 6);
    const trimmed = base.length > 30 ? base.slice(0, 30) : base;
    return `inc-${shortId}-${trimmed}`.slice(0, 80);
  }

  async getWorkspaceIdByClerkId(clerkId: string) {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    return user?.workspaceId ?? null;
  }

  async listTimelineEntries(workspaceId: string, groupId: string) {
    const entries = await prisma.incidentTimelineEntry.findMany({
      where: { alertGroupId: groupId, alertGroup: { workspaceId } },
      orderBy: { occurredAt: 'asc' },
    });
    return entries;
  }

  async createTimelineEntry(
    groupId: string,
    entry: {
      type: IncidentTimelineEventType;
      title: string;
      message?: string;
      source?: string;
      metadata?: Record<string, unknown>;
      occurredAt?: Date;
    },
  ) {
    return prisma.incidentTimelineEntry.create({
      data: {
        alertGroupId: groupId,
        type: entry.type,
        title: entry.title,
        message: entry.message,
        source: entry.source,
        metadataJson: entry.metadata as Prisma.InputJsonValue | undefined,
        occurredAt: entry.occurredAt ?? new Date(),
      },
    });
  }

  private mapSeverity(severity: NormalizedAlert['severity']): AlertSeverity {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return AlertSeverity.CRITICAL;
      case AlertSeverity.HIGH:
        return AlertSeverity.HIGH;
      case AlertSeverity.MEDIUM:
        return AlertSeverity.MEDIUM;
      case AlertSeverity.LOW:
        return AlertSeverity.LOW;
      case AlertSeverity.INFO:
      default:
        return AlertSeverity.INFO;
    }
  }

  private normalizeStatus(status?: string): AlertStatus | undefined {
    if (!status) {
      return undefined;
    }
    const value = status.toUpperCase();
    if (Object.values(AlertStatus).includes(value as AlertStatus)) {
      return value as AlertStatus;
    }
    return undefined;
  }
}
