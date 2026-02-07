/**
 * Alert Processor Service
 *
 * Orchestrates the complete alert processing pipeline:
 * 1. Normalize incoming alert
 * 2. Check for duplicates
 * 3. Group/deduplicate alerts
 * 4. Store alert event
 * 5. Evaluate routing rules
 * 6. Queue notifications based on matched rules
 * 7. Schedule escalations if configured
 *
 * @module alerts/alert-processor.service
 */
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { NormalizationService } from './normalization.service';
import { GroupingService } from './grouping.service';
import { AlertsService } from './alerts.service';
import { QueueService } from '../queues/queue.service';
import { RulesEngineService } from '../routing/rules-engine.service';
import { EscalationService } from '../escalations/escalation.service';
import { EscalationPoliciesService } from '../escalation-policies/escalation-policies.service';
import { AlertForEvaluation, RuleEvaluationResult, NormalizedAlert } from '@signalcraft/shared';
import {
  AlertGroup,
  AlertEvent,
  IncidentTimelineEventType,
  IntegrationType,
} from '@signalcraft/database';
import { InternalServerException } from '../common/exceptions/base.exception';
import { JiraService } from '../integrations/jira.service';
import { ExternalMappingsService } from '../sync/external-mappings.service';

interface ProcessingResult {
  duplicate: boolean;
  groupId?: string;
  eventId?: string;
  rulesEvaluated?: number;
  rulesMatched?: number;
  notificationsQueued?: number;
  escalationsScheduled?: number;
  resolved?: boolean;
}

@Injectable()
export class AlertProcessorService {
  private readonly logger = new Logger(AlertProcessorService.name);

  constructor(
    private readonly normalizationService: NormalizationService,
    private readonly groupingService: GroupingService,
    private readonly alertsService: AlertsService,
    private readonly queueService: QueueService,
    @Inject(forwardRef(() => RulesEngineService))
    private readonly rulesEngine: RulesEngineService,
    @Inject(forwardRef(() => EscalationService))
    private readonly escalationService: EscalationService,
    private readonly escalationPoliciesService: EscalationPoliciesService,
    private readonly jiraService: JiraService,
    private readonly externalMappingsService: ExternalMappingsService,
  ) {}

  /**
   * Process an incoming Datadog alert event
   */
  async processDatadogEvent({
    workspaceId,
    payload,
  }: {
    workspaceId: string;
    payload: Record<string, unknown>;
  }): Promise<ProcessingResult> {
    const normalized = this.normalizationService.normalizeDatadog(payload);

    if (this.isDatadogResolved(payload)) {
      const resolved = await this.alertsService.resolveAlertBySourceEventId(
        workspaceId,
        normalized.sourceEventId,
        'integration:datadog',
        'Resolved via Datadog',
      );
      return { duplicate: false, resolved: Boolean(resolved) };
    }

    return this.processNormalizedAlert({ workspaceId, normalized, payload });
  }

  /**
   * Process an incoming Sentry alert event
   */
  async processSentryEvent({
    workspaceId,
    payload,
  }: {
    workspaceId: string;
    payload: Record<string, unknown>;
  }): Promise<ProcessingResult> {
    const normalized = this.normalizationService.normalizeSentry(payload);
    if (this.isSentryResolved(payload)) {
      const resolved = await this.alertsService.resolveAlertBySourceEventId(
        workspaceId,
        normalized.sourceEventId,
        'integration:sentry',
        'Resolved via Sentry',
      );
      return { duplicate: false, resolved: Boolean(resolved) };
    }

    return this.processNormalizedAlert({ workspaceId, normalized, payload });
  }

  async processNormalizedAlert({
    workspaceId,
    normalized,
    payload,
  }: {
    workspaceId: string;
    normalized: NormalizedAlert;
    payload: Record<string, unknown>;
  }): Promise<ProcessingResult> {
    const startTime = Date.now();

    // Step 1: Check duplicates
    const duplicate = await this.alertsService.isDuplicate(workspaceId, normalized.sourceEventId);
    if (duplicate) {
      this.logger.log(`Duplicate ${normalized.source} alert ignored`, {
        workspaceId,
        sourceEventId: normalized.sourceEventId,
      });
      return { duplicate: true };
    }

    // Step 2: Grouping
    const group = (await this.groupingService.upsertGroup(workspaceId, normalized)) as AlertGroup;

    await this.upsertExternalMappingIfNeeded(group.id, normalized);

    // Step 3: Save event
    const event = (await this.alertsService.saveAlertEvent(
      workspaceId,
      normalized,
      payload,
      group.id,
    )) as AlertEvent;

    // Step 4: Evaluate routing (Shared logic)
    const routingResult = await this.evaluateAndRoute(
      workspaceId,
      group,
      normalized,
      event,
      startTime,
    );

    // Step 5: Optional Jira auto-creation for critical alerts
    await this.maybeCreateJiraTicket(workspaceId, group, normalized);

    return routingResult;
  }

  async processPrometheusEvent({
    workspaceId,
    payload,
  }: {
    workspaceId: string;
    payload: Record<string, unknown>;
  }): Promise<ProcessingResult> {
    const normalized = this.buildPrometheusNormalized(payload, 'PROMETHEUS');
    if (!normalized) {
      return { duplicate: false };
    }

    if (this.isPrometheusResolved(payload)) {
      const resolved = await this.alertsService.resolveAlertBySourceEventId(
        workspaceId,
        normalized.sourceEventId,
        'integration:prometheus',
        'Resolved via Prometheus',
      );
      return { duplicate: false, resolved: Boolean(resolved) };
    }

    return this.processNormalizedAlert({ workspaceId, normalized, payload });
  }

  async processGrafanaEvent({
    workspaceId,
    payload,
  }: {
    workspaceId: string;
    payload: Record<string, unknown>;
  }): Promise<ProcessingResult> {
    const normalized = this.buildPrometheusNormalized(payload, 'GRAFANA');
    if (!normalized) {
      return { duplicate: false };
    }

    if (this.isGrafanaResolved(payload)) {
      const resolved = await this.alertsService.resolveAlertBySourceEventId(
        workspaceId,
        normalized.sourceEventId,
        'integration:grafana',
        'Resolved via Grafana',
      );
      return { duplicate: false, resolved: Boolean(resolved) };
    }

    return this.processNormalizedAlert({ workspaceId, normalized, payload });
  }

  private async maybeCreateJiraTicket(
    workspaceId: string,
    group: AlertGroup,
    normalized: NormalizedAlert,
  ) {
    if (normalized.severity !== 'CRITICAL') {
      return;
    }

    try {
      const shouldAutoCreate = await this.jiraService.shouldAutoCreate(workspaceId);
      if (!shouldAutoCreate) {
        return;
      }

      await this.alertsService.createJiraTicket(workspaceId, group.id, { notifySlack: true });
    } catch (error) {
      this.logger.warn('Failed to auto-create Jira issue', {
        workspaceId,
        alertGroupId: group.id,
        error,
      });
    }
  }

  private isDatadogResolved(payload: Record<string, unknown>): boolean {
    const status = String(payload.alert_type || payload.status || '').toLowerCase();
    return ['success', 'recovery', 'resolved', 'ok'].includes(status);
  }

  private isPrometheusResolved(payload: Record<string, unknown>): boolean {
    const status = String((payload as any).status || '').toLowerCase();
    if (status === 'resolved') {
      return true;
    }
    const alerts = (payload as any).alerts;
    if (Array.isArray(alerts)) {
      return alerts.every((alert) => String(alert?.status || '').toLowerCase() === 'resolved');
    }
    return false;
  }

  private isGrafanaResolved(payload: Record<string, unknown>): boolean {
    const status = String((payload as any).status || (payload as any).state || '').toLowerCase();
    return ['ok', 'resolved'].includes(status);
  }

  private isSentryResolved(payload: Record<string, unknown>): boolean {
    const event = (payload as any).event || (payload as any).data || {};
    const status = String(event.status || (payload as any).status || '').toLowerCase();
    return ['resolved', 'closed', 'ok'].includes(status);
  }

  private async upsertExternalMappingIfNeeded(alertGroupId: string, normalized: NormalizedAlert) {
    const integrationType = this.mapSourceToIntegrationType(normalized.source);
    if (!integrationType) {
      return;
    }

    await this.externalMappingsService.upsertMapping({
      alertGroupId,
      integrationType,
      externalId: normalized.sourceEventId,
      metadata: {
        source: normalized.source,
      },
    });
  }

  private mapSourceToIntegrationType(source: string): IntegrationType | null {
    switch (source.toUpperCase()) {
      case 'DATADOG':
        return IntegrationType.DATADOG;
      case 'PROMETHEUS':
        return IntegrationType.PROMETHEUS;
      case 'GRAFANA':
        return IntegrationType.GRAFANA;
      case 'SENTRY':
        return IntegrationType.SENTRY;
      default:
        return null;
    }
  }

  private buildPrometheusNormalized(
    payload: Record<string, unknown>,
    source: 'PROMETHEUS' | 'GRAFANA',
  ): NormalizedAlert | null {
    const alerts = (payload as any).alerts;
    if (!Array.isArray(alerts) || alerts.length === 0) {
      return null;
    }

    const alert =
      alerts.find((entry) => String(entry?.status || '').toLowerCase() !== 'resolved') ?? alerts[0];

    if (source === 'GRAFANA') {
      return this.normalizationService.normalizeGrafanaAlert(payload, alert);
    }

    return this.normalizationService.normalizeAlertmanagerAlert(payload as any, alert as any);
  }

  private async evaluateAndRoute(
    workspaceId: string,
    group: AlertGroup,
    normalized: NormalizedAlert,
    event: AlertEvent,
    startTime: number,
  ): Promise<ProcessingResult> {
    const alertForEval: AlertForEvaluation = {
      id: group.id,
      workspaceId,
      environment: normalized.environment,
      severity: normalized.severity,
      project: normalized.project,
      title: normalized.title,
      source: normalized.source,
      status: group.status,
      count: group.count,
      tags: normalized.tags,
    };

    const ruleResults = await this.rulesEngine.evaluateRules(workspaceId, alertForEval);
    const matchedRules = ruleResults.filter((r) => r.matched);

    // Step 6 & 7: Queue notifications and schedule escalations for matched rules
    let notificationsQueued = 0;
    let escalationsScheduled = 0;

    for (const result of matchedRules) {
      if (result.actions) {
        // Queue notification
        try {
          await this.queueNotification(workspaceId, group.id, result);
          notificationsQueued++;
        } catch (error) {
          this.logger.warn(`Failed to queue notification`, {
            ruleId: result.ruleId,
            error,
          });
        }

        // Schedule escalation if configured
        if (result.actions.escalationPolicyId) {
          try {
            const policyRules = await this.escalationPoliciesService.getPolicyRules(
              workspaceId,
              result.actions.escalationPolicyId,
            );
            const rules = Array.isArray((policyRules as any).rules)
              ? ((policyRules as any).rules as Array<Record<string, unknown>>)
              : [];
            const primaryRule = rules[0];
            const delayMinutes = Number(primaryRule?.delayMinutes ?? 0);
            const channelId =
              (primaryRule?.channelId as string | undefined) ||
              result.actions.escalationChannelId ||
              result.actions.slackChannelId;
            const mentionHere =
              (primaryRule?.mentionHere as boolean | undefined) ??
              result.actions.escalationMentionHere ??
              true;

            if (delayMinutes > 0 && channelId) {
              await this.escalationService.scheduleEscalation(workspaceId, group.id, {
                ...result.actions,
                escalateAfterMinutes: delayMinutes,
                escalationChannelId: channelId,
                escalationMentionHere: mentionHere,
              });
              escalationsScheduled++;
            } else {
              this.logger.warn('Escalation policy missing delayMinutes or channelId', {
                ruleId: result.ruleId,
                policyId: result.actions.escalationPolicyId,
              });
            }
          } catch (error) {
            this.logger.warn(`Failed to schedule escalation policy`, {
              ruleId: result.ruleId,
              error,
            });
          }
        } else if (result.actions.escalateAfterMinutes) {
          try {
            await this.escalationService.scheduleEscalation(workspaceId, group.id, result.actions);
            escalationsScheduled++;
          } catch (error) {
            this.logger.warn(`Failed to schedule escalation`, {
              ruleId: result.ruleId,
              error,
            });
          }
        }
      }
    }

    // If no rules matched, use default routing (fallback)
    if (matchedRules.length === 0) {
      try {
        await this.queueDefaultNotification(workspaceId, group.id);
        notificationsQueued = 1;
      } catch (error) {
        throw new InternalServerException('Failed to queue default notification', { error });
      }
    }

    const processingTimeMs = Date.now() - startTime;
    this.logger.log(`Alert processed (${normalized.source})`, {
      workspaceId,
      groupId: group.id,
      eventId: event.id,
      rulesEvaluated: ruleResults.length,
      rulesMatched: matchedRules.length,
      notificationsQueued,
      escalationsScheduled,
      processingTimeMs,
    });

    return {
      duplicate: false,
      groupId: group.id,
      eventId: event.id,
      rulesEvaluated: ruleResults.length,
      rulesMatched: matchedRules.length,
      notificationsQueued,
      escalationsScheduled,
    };
  }

  /**
   * Queue notification based on matched routing rule
   */
  private async queueNotification(
    workspaceId: string,
    alertGroupId: string,
    ruleResult: RuleEvaluationResult,
  ) {
    if (!ruleResult.actions) return;

    const {
      slackChannelId,
      mentionHere,
      mentionChannel,
      sendToTeams,
      sendToDiscord,
      createPagerDutyIncident,
      createOpsgenieAlert,
    } = ruleResult.actions;

    if (slackChannelId) {
      await this.queueService.addJob('notifications', 'slack-channel-alert', {
        workspaceId,
        alertGroupId,
        channelId: slackChannelId,
        mentionHere: mentionHere ?? false,
        mentionChannel: mentionChannel ?? false,
        ruleId: ruleResult.ruleId,
        ruleName: ruleResult.ruleName,
      });

      this.logger.debug(`Slack notification queued from rule`, {
        ruleId: ruleResult.ruleId,
        channelId: slackChannelId,
      });

      await this.alertsService.createTimelineEntry(alertGroupId, {
        type: IncidentTimelineEventType.ROUTING_NOTIFICATION,
        title: 'Notification queued (Slack)',
        message: ruleResult.ruleName,
        source: 'routing',
      });
    }

    if (sendToTeams) {
      await this.queueService.addJob('notifications', 'teams-alert', {
        workspaceId,
        alertGroupId,
        ruleId: ruleResult.ruleId,
        ruleName: ruleResult.ruleName,
      });

      await this.alertsService.createTimelineEntry(alertGroupId, {
        type: IncidentTimelineEventType.ROUTING_NOTIFICATION,
        title: 'Notification queued (Teams)',
        message: ruleResult.ruleName,
        source: 'routing',
      });
    }

    if (sendToDiscord) {
      await this.queueService.addJob('notifications', 'discord-alert', {
        workspaceId,
        alertGroupId,
        ruleId: ruleResult.ruleId,
        ruleName: ruleResult.ruleName,
      });

      await this.alertsService.createTimelineEntry(alertGroupId, {
        type: IncidentTimelineEventType.ROUTING_NOTIFICATION,
        title: 'Notification queued (Discord)',
        message: ruleResult.ruleName,
        source: 'routing',
      });
    }

    if (createPagerDutyIncident) {
      await this.queueService.addJob('notifications', 'pagerduty-incident', {
        workspaceId,
        alertGroupId,
        ruleId: ruleResult.ruleId,
        ruleName: ruleResult.ruleName,
      });

      await this.alertsService.createTimelineEntry(alertGroupId, {
        type: IncidentTimelineEventType.ROUTING_NOTIFICATION,
        title: 'Notification queued (PagerDuty)',
        message: ruleResult.ruleName,
        source: 'routing',
      });
    }

    if (createOpsgenieAlert) {
      await this.queueService.addJob('notifications', 'opsgenie-alert', {
        workspaceId,
        alertGroupId,
        ruleId: ruleResult.ruleId,
        ruleName: ruleResult.ruleName,
      });

      await this.alertsService.createTimelineEntry(alertGroupId, {
        type: IncidentTimelineEventType.ROUTING_NOTIFICATION,
        title: 'Notification queued (Opsgenie)',
        message: ruleResult.ruleName,
        source: 'routing',
      });
    }
  }

  /**
   * Queue default notification (fallback when no rules match)
   */
  private async queueDefaultNotification(workspaceId: string, alertGroupId: string) {
    await this.queueService.addJob('notifications', 'alert-created', {
      workspaceId,
      alertGroupId,
    });
  }
}
