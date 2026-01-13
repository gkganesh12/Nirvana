import { Injectable, Logger } from '@nestjs/common';
import { WebClient } from '@slack/web-api';
import { prisma, AlertStatus } from '@signalcraft/database';
import { SlackOAuthService } from '../integrations/slack/oauth.service';
import { SlackService } from '../integrations/slack/slack.service';

@Injectable()
export class SlackNotificationService {
  private readonly logger = new Logger(SlackNotificationService.name);

  constructor(
    private readonly slackOAuth: SlackOAuthService,
    private readonly slackService: SlackService,
  ) { }

  async sendAlert(workspaceId: string, alertGroupId: string) {
    const token = await this.slackOAuth.getDecryptedToken(workspaceId);
    if (!token) {
      throw new Error('Slack not connected');
    }

    const channelId = await this.slackService.getDefaultChannel(workspaceId);
    if (!channelId) {
      throw new Error('Default Slack channel not configured');
    }

    const group = await prisma.alertGroup.findFirst({
      where: { id: alertGroupId, workspaceId },
    });
    if (!group) {
      throw new Error('Alert group not found');
    }

    const client = new WebClient(token);
    const blocks = this.buildBlocks(group);
    const response = await client.chat.postMessage({
      channel: channelId,
      text: group.title,
      blocks,
    });

    return { channelId, ts: response.ts };
  }

  async updateMessage(
    workspaceId: string,
    channelId: string,
    ts: string,
    alertGroupId: string,
  ) {
    const token = await this.slackOAuth.getDecryptedToken(workspaceId);
    if (!token) {
      throw new Error('Slack not connected');
    }
    const group = await prisma.alertGroup.findFirst({
      where: { id: alertGroupId, workspaceId },
    });
    if (!group) {
      throw new Error('Alert group not found');
    }

    const client = new WebClient(token);
    const blocks = this.buildBlocks(group, true);
    await client.chat.update({
      channel: channelId,
      ts,
      text: group.title,
      blocks,
    });
  }

  private buildBlocks(group: { id: string; title: string; severity: string; environment: string; count: number; status: AlertStatus }, disableActions = false) {
    const severityEmoji = this.mapSeverity(group.severity);
    const statusLabel = group.status.toLowerCase();
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${severityEmoji} *${group.title}*`,
        },
        fields: [
          { type: 'mrkdwn', text: `*Env:* ${group.environment}` },
          { type: 'mrkdwn', text: `*Count:* ${group.count}` },
          { type: 'mrkdwn', text: `*Status:* ${statusLabel}` },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Acknowledge' },
            style: 'primary',
            action_id: 'ack',
            value: group.id,
            ...(disableActions ? { disabled: true } : {}),
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Snooze 1h' },
            action_id: 'snooze',
            value: group.id,
            ...(disableActions ? { disabled: true } : {}),
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Resolve' },
            style: 'danger',
            action_id: 'resolve',
            value: group.id,
            ...(disableActions ? { disabled: true } : {}),
          },
        ],
      },
    ];
  }

  /**
   * Send alert to a specific channel (from routing rules)
   */
  async sendToChannel(
    workspaceId: string,
    alertGroupId: string,
    channelId: string,
    options: { mentionHere?: boolean; mentionChannel?: boolean } = {},
  ) {
    const token = await this.slackOAuth.getDecryptedToken(workspaceId);
    if (!token) {
      throw new Error('Slack not connected');
    }

    const group = await prisma.alertGroup.findFirst({
      where: { id: alertGroupId, workspaceId },
    });
    if (!group) {
      throw new Error('Alert group not found');
    }

    const client = new WebClient(token);
    const blocks = this.buildBlocks(group);

    // Build text with optional mentions
    let text = group.title;
    if (options.mentionChannel) {
      text = `<!channel> ${text}`;
    } else if (options.mentionHere) {
      text = `<!here> ${text}`;
    }

    const response = await client.chat.postMessage({
      channel: channelId,
      text,
      blocks,
    });

    this.logger.log(`Alert sent to channel`, {
      alertGroupId,
      channelId,
      ts: response.ts,
    });

    return { channelId, ts: response.ts };
  }

  /**
   * Send escalation notification
   */
  async sendEscalation(
    workspaceId: string,
    alertGroupId: string,
    channelId: string,
    escalationLevel: number,
    mentionHere: boolean,
  ) {
    const token = await this.slackOAuth.getDecryptedToken(workspaceId);
    if (!token) {
      throw new Error('Slack not connected');
    }

    const group = await prisma.alertGroup.findFirst({
      where: { id: alertGroupId, workspaceId },
    });
    if (!group) {
      throw new Error('Alert group not found');
    }

    const client = new WebClient(token);
    const blocks = this.buildEscalationBlocks(group, escalationLevel);

    // Always mention for escalations
    const mention = mentionHere ? '<!here>' : '';
    const text = `${mention} 🚨 *ESCALATION (Level ${escalationLevel})* - ${group.title}`;

    const response = await client.chat.postMessage({
      channel: channelId,
      text,
      blocks,
    });

    this.logger.log(`Escalation notification sent`, {
      alertGroupId,
      channelId,
      level: escalationLevel,
      ts: response.ts,
    });

    return { channelId, ts: response.ts };
  }

  private buildEscalationBlocks(
    group: { id: string; title: string; severity: string; environment: string; count: number; status: AlertStatus },
    escalationLevel: number,
  ) {
    const severityEmoji = this.mapSeverity(group.severity);
    const statusLabel = group.status.toLowerCase();

    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🚨 *ESCALATION (Level ${escalationLevel})* 🚨\n${severityEmoji} *${group.title}*`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Env:* ${group.environment}` },
          { type: 'mrkdwn', text: `*Count:* ${group.count}` },
          { type: 'mrkdwn', text: `*Status:* ${statusLabel}` },
          { type: 'mrkdwn', text: `*Escalation Level:* ${escalationLevel}` },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '⚠️ This alert has not been acknowledged. Please take action immediately.',
          },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Acknowledge' },
            style: 'primary',
            action_id: 'ack',
            value: group.id,
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Resolve' },
            style: 'danger',
            action_id: 'resolve',
            value: group.id,
          },
        ],
      },
    ];
  }

  private mapSeverity(severity: string) {
    switch (severity) {
      case 'CRITICAL':
        return '🔴';
      case 'HIGH':
        return '🟠';
      case 'MEDIUM':
        return '🟡';
      case 'LOW':
        return '🔵';
      default:
        return '⚪';
    }
  }
}
