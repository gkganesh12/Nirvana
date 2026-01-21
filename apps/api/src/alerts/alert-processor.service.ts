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
import { AlertForEvaluation, RuleEvaluationResult, NormalizedAlert } from '@signalcraft/shared';
import { AlertGroup, AlertEvent } from '@signalcraft/database';
import { InternalServerException } from '../common/exceptions/base.exception';

interface ProcessingResult {
  duplicate: boolean;
  groupId?: string;
  eventId?: string;
  rulesEvaluated?: number;
  rulesMatched?: number;
  notificationsQueued?: number;
  escalationsScheduled?: number;
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
  ) { }

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
    const startTime = Date.now();

    // Step 1: Normalize
    const normalized = this.normalizationService.normalizeDatadog(payload);

    // Step 2: Check duplicates
    const duplicate = await this.alertsService.isDuplicate(
      workspaceId,
      normalized.sourceEventId,
    );
    if (duplicate) {
      this.logger.log(`Duplicate Datadog alert ignored`, {
        workspaceId,
        sourceEventId: normalized.sourceEventId,
      });
      return { duplicate: true };
    }

    // Step 3: Grouping
    const group = await this.groupingService.upsertGroup(workspaceId, normalized) as AlertGroup;

    // Step 4: Save event
    const event = await this.alertsService.saveAlertEvent(
      workspaceId,
      normalized,
      payload,
      group.id,
    ) as AlertEvent;

    // Step 5: Evaluate routing (Shared logic)
    return this.evaluateAndRoute(workspaceId, group, normalized, event, startTime);
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
    const startTime = Date.now();

    // Step 1: Normalize the alert
    const normalized = this.normalizationService.normalizeSentry(payload);

    // Step 2: Check for duplicates
    const duplicate = await this.alertsService.isDuplicate(
      workspaceId,
      normalized.sourceEventId,
    );
    if (duplicate) {
      this.logger.log(`Duplicate alert ignored`, {
        workspaceId,
        sourceEventId: normalized.sourceEventId,
      });
      return { duplicate: true };
    }

    // Step 3: Upsert alert group (deduplication)
    const group = await this.groupingService.upsertGroup(workspaceId, normalized) as AlertGroup;

    // Step 4: Save the alert event
    const event = await this.alertsService.saveAlertEvent(
      workspaceId,
      normalized,
      payload,
      group.id,
    ) as AlertEvent;

    // Step 5: Evaluate routing
    return this.evaluateAndRoute(workspaceId, group, normalized, event, startTime);
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
        if (result.actions.escalateAfterMinutes) {
          try {
            await this.escalationService.scheduleEscalation(
              workspaceId,
              group.id,
              result.actions,
            );
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

    const { slackChannelId, mentionHere, mentionChannel } = ruleResult.actions;

    await this.queueService.addJob('notifications', 'routed-alert', {
      workspaceId,
      alertGroupId,
      channelId: slackChannelId,
      mentionHere: mentionHere ?? false,
      mentionChannel: mentionChannel ?? false,
      ruleId: ruleResult.ruleId,
      ruleName: ruleResult.ruleName,
    });

    this.logger.debug(`Notification queued from rule`, {
      ruleId: ruleResult.ruleId,
      channelId: slackChannelId,
    });
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
