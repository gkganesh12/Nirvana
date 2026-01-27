import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { SlackNotificationService } from './slack-notification.service';
import { NotificationLogService } from './notification-log.service';
import { TeamsNotificationService } from './teams-notification.service';
import { DiscordNotificationService } from './discord-notification.service';
import { PagerDutyService } from '../integrations/pagerduty.service';
import { OpsgenieService } from '../integrations/opsgenie.service';
import { IntegrationType, NotificationTarget } from '@signalcraft/database';
import { ExternalMappingsService } from '../sync/external-mappings.service';

@Injectable()
export class NotificationProcessor implements OnModuleDestroy {
  private readonly worker?: Worker;

  constructor(
    private readonly slackService: SlackNotificationService,
    private readonly logService: NotificationLogService,
    private readonly teamsService: TeamsNotificationService,
    private readonly discordService: DiscordNotificationService,
    private readonly pagerDutyService: PagerDutyService,
    private readonly opsgenieService: OpsgenieService,
    private readonly externalMappingsService: ExternalMappingsService,
  ) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      return;
    }
    const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    this.worker = new Worker(
      'notifications',
      async (job) => {
        const { workspaceId, alertGroupId, channelId, mentionHere, mentionChannel, target } =
          job.data as {
            workspaceId: string;
            alertGroupId: string;
            channelId?: string;
            mentionHere?: boolean;
            mentionChannel?: boolean;
            target?: string;
          };

        switch (job.name) {
          case 'routed-alert':
          case 'alert-created':
          case 'slack-alert': {
            const result = await this.slackService.sendAlert(workspaceId, alertGroupId);
            await this.logService.logSuccess(
              workspaceId,
              result.channelId,
              alertGroupId,
              NotificationTarget.SLACK,
            );
            return result;
          }
          case 'slack-channel-alert': {
            const result = await this.slackService.sendToChannel(
              workspaceId,
              alertGroupId,
              channelId ?? '',
              {
                mentionHere: mentionHere ?? false,
                mentionChannel: mentionChannel ?? false,
              },
            );
            await this.logService.logSuccess(
              workspaceId,
              result.channelId,
              alertGroupId,
              NotificationTarget.SLACK,
            );
            return result;
          }
          case 'teams-alert': {
            const result = await this.teamsService.sendAlert(workspaceId, alertGroupId);
            await this.logService.logSuccess(
              workspaceId,
              result.targetRef,
              alertGroupId,
              NotificationTarget.TEAMS,
            );
            return result;
          }
          case 'discord-alert': {
            const result = await this.discordService.sendAlert(workspaceId, alertGroupId);
            await this.logService.logSuccess(
              workspaceId,
              result.targetRef,
              alertGroupId,
              NotificationTarget.DISCORD,
            );
            return result;
          }
          case 'pagerduty-incident': {
            const incident = await this.pagerDutyService.createIncidentFromAlert(
              workspaceId,
              alertGroupId,
            );
            if (incident.incidentId) {
              await this.externalMappingsService.upsertMapping({
                alertGroupId,
                integrationType: IntegrationType.PAGERDUTY,
                externalId: incident.incidentId,
                metadata: {
                  source: 'signalcraft',
                },
              });
            }
            await this.logService.logSuccess(
              workspaceId,
              incident.incidentId ?? 'pagerduty',
              alertGroupId,
              NotificationTarget.PAGERDUTY,
            );
            return incident;
          }
          case 'opsgenie-alert': {
            const alert = await this.opsgenieService.createAlertFromAlert(
              workspaceId,
              alertGroupId,
            );
            if (alert.alertId) {
              await this.externalMappingsService.upsertMapping({
                alertGroupId,
                integrationType: IntegrationType.OPSGENIE,
                externalId: alert.alertId,
                metadata: {
                  source: 'signalcraft',
                },
              });
            }
            await this.logService.logSuccess(
              workspaceId,
              alert.alertId ?? 'opsgenie',
              alertGroupId,
              NotificationTarget.OPSGENIE,
            );
            return alert;
          }
          default:
            throw new Error(`Unsupported notification job: ${job.name}`);
        }
      },
      { connection },
    );

    this.worker.on('failed', async (job, err) => {
      if (!job) {
        return;
      }
      const { workspaceId, alertGroupId, channelId, target } = job.data as {
        workspaceId: string;
        alertGroupId: string;
        channelId?: string;
        target?: string;
      };
      const targetRef = channelId ?? target ?? 'unknown';
      const mappedTarget = this.mapTarget(job.name);
      await this.logService.logFailure(
        workspaceId,
        targetRef,
        alertGroupId,
        err.message,
        mappedTarget,
      );
    });
  }

  private mapTarget(jobName: string): NotificationTarget {
    switch (jobName) {
      case 'teams-alert':
        return NotificationTarget.TEAMS;
      case 'discord-alert':
        return NotificationTarget.DISCORD;
      case 'pagerduty-incident':
        return NotificationTarget.PAGERDUTY;
      case 'opsgenie-alert':
        return NotificationTarget.OPSGENIE;
      default:
        return NotificationTarget.SLACK;
    }
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
    }
  }
}
