import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { WebClient, AnyBlock } from '@slack/web-api';
import { prisma, AlertStatus } from '@signalcraft/database';
import { SlackOAuthService } from '../integrations/slack/oauth.service';
import { SlackService } from '../integrations/slack/slack.service';
import { AiService } from '../ai/ai.service';
import { AlertsService } from '../alerts/alerts.service';
import {
  ResourceNotFoundException,
  AuthenticationException,
  InternalServerException,
} from '../common/exceptions/base.exception';

@Injectable()
export class SlackNotificationService {
  private readonly logger = new Logger(SlackNotificationService.name);

  constructor(
    private readonly slackOAuth: SlackOAuthService,
    private readonly slackService: SlackService,
    private readonly aiService: AiService,
    @Inject(forwardRef(() => AlertsService)) private readonly alertsService: AlertsService,
  ) {}

  async sendAlert(workspaceId: string, alertGroupId: string) {
    const token = await this.slackOAuth.getDecryptedToken(workspaceId);
    if (!token) {
      throw new AuthenticationException('Slack not connected for this workspace');
    }

    const channelId = await this.slackService.getDefaultChannel(workspaceId);
    if (!channelId) {
      throw new ResourceNotFoundException('Default Slack channel');
    }

    const group = await prisma.alertGroup.findFirst({
      where: { id: alertGroupId, workspaceId },
    });
    if (!group) {
      throw new ResourceNotFoundException('Alert group', alertGroupId);
    }

    // AI Resolution Suggestion
    let aiSuggestion: { suggestion: string; confidence: string } | null = null;
    if (this.aiService.isEnabled()) {
      try {
        const result = await this.alertsService.getAiSuggestion(workspaceId, alertGroupId);
        if (result?.enabled && result.suggestion) {
          aiSuggestion = result.suggestion;
        }
      } catch (error) {
        this.logger.error(`Failed to get AI suggestion for alert ${alertGroupId}: ${error}`);
      }
    }

    const client = new WebClient(token);
    const blocks = this.buildBlocks(group, false, aiSuggestion);

    try {
      const response = await client.chat.postMessage({
        channel: channelId,
        text: group.title,
        blocks,
      });

      return { channelId, ts: response.ts };
    } catch (error) {
      throw new InternalServerException('Failed to send Slack alert', {
        workspaceId,
        alertGroupId,
        error,
      });
    }
  }

  async updateMessage(workspaceId: string, channelId: string, ts: string, alertGroupId: string) {
    const token = await this.slackOAuth.getDecryptedToken(workspaceId);
    if (!token) {
      throw new AuthenticationException('Slack not connected for this workspace');
    }
    const group = await prisma.alertGroup.findFirst({
      where: { id: alertGroupId, workspaceId },
    });
    if (!group) {
      throw new ResourceNotFoundException('Alert group', alertGroupId);
    }

    const client = new WebClient(token);
    const blocks = this.buildBlocks(group, true, null);

    try {
      await client.chat.update({
        channel: channelId,
        ts,
        text: group.title,
        blocks,
      });
    } catch (error) {
      this.logger.error(`Failed to update Slack message ${ts} in channel ${channelId}: ${error}`);
    }
  }

  async postStatusUpdate(workspaceId: string, channelId: string, alertGroupId: string) {
    const token = await this.slackOAuth.getDecryptedToken(workspaceId);
    if (!token) {
      throw new AuthenticationException('Slack not connected for this workspace');
    }

    const group = await prisma.alertGroup.findFirst({
      where: { id: alertGroupId, workspaceId },
    });
    if (!group) {
      throw new ResourceNotFoundException('Alert group', alertGroupId);
    }

    const client = new WebClient(token);
    const blocks = this.buildBlocks(group, true, null);

    try {
      await client.chat.postMessage({
        channel: channelId,
        text: `Alert ${group.status.toLowerCase()}: ${group.title}`,
        blocks,
      });
    } catch (error) {
      this.logger.error(`Failed to post Slack status update to ${channelId}: ${error}`);
    }
  }

  /**
   * Extended group interface for enriched Slack messages
   */
  private buildBlocks(
    group: {
      id: string;
      title: string;
      severity: string;
      environment: string;
      count: number;
      status: AlertStatus;
      runbookUrl?: string | null;
      resolutionNotes?: string | null;
      lastResolvedBy?: string | null;
      avgResolutionMins?: number | null;
      userCount?: number | null;
      velocityPerHour?: number | null;
      jiraIssueUrl?: string | null;
    },
    disableActions = false,
    aiSuggestion?: { suggestion: string; confidence: string } | null,
  ): AnyBlock[] {
    const severityEmoji = this.mapSeverity(group.severity);
    const statusLabel = group.status.toLowerCase();

    // Using record for blocks to avoid @slack/web-api type dependency issues if they change
    const blocks: AnyBlock[] = [];

    // Main alert section
    blocks.push({
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
    });

    // AI Suggestion (Differentiation Feature)
    if (aiSuggestion) {
      const confidenceEmoji =
        aiSuggestion.confidence === 'high'
          ? '🟢'
          : aiSuggestion.confidence === 'medium'
            ? '🟡'
            : '⚪';
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `💡 *AI Suggestion* (${confidenceEmoji} Confidence)\n${aiSuggestion.suggestion}`,
        },
      });
    }

    // Impact Badge (Differentiation Feature)
    const impactBadge = this.getImpactBadge(group);
    if (impactBadge) {
      blocks.push({
        type: 'context',
        elements: [{ type: 'mrkdwn', text: impactBadge }],
      });
    }

    // Resolution Memory (Differentiation Feature)
    if (group.count > 1 && group.resolutionNotes) {
      const resolverInfo = group.lastResolvedBy ? ` by ${group.lastResolvedBy}` : '';
      const timeInfo = group.avgResolutionMins ? ` (avg ${group.avgResolutionMins} min)` : '';
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `🔄 *Previous fix${resolverInfo}${timeInfo}:* "${group.resolutionNotes}"`,
          },
        ],
      });
    }

    // Runbook Section (Differentiation Feature)
    if (group.runbookUrl) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `📖 *Runbook:* <${group.runbookUrl}|View Runbook>` },
      });
    } else {
      blocks.push({
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: '⚠️ No runbook for this alert type. Consider adding one!' },
        ],
      });
    }

    if (group.jiraIssueUrl) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `🎫 *Jira:* <${group.jiraIssueUrl}|View Ticket>` },
      });
    }

    // Action buttons
    blocks.push({
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
    });

    return blocks;
  }

  async sendJiraTicketNotification(
    workspaceId: string,
    alertGroupId: string,
    issueKey: string | null,
    issueUrl: string | null,
  ) {
    const token = await this.slackOAuth.getDecryptedToken(workspaceId);
    if (!token) {
      return;
    }

    const channelId = await this.slackService.getDefaultChannel(workspaceId);
    if (!channelId) {
      return;
    }

    const group = await prisma.alertGroup.findFirst({
      where: { id: alertGroupId, workspaceId },
    });
    if (!group) {
      return;
    }

    const client = new WebClient(token);
    const linkText = issueKey && issueUrl ? `<${issueUrl}|${issueKey}>` : 'Jira ticket';
    const text = `🎫 ${linkText} created for *${group.title}*`;

    try {
      await client.chat.postMessage({
        channel: channelId,
        text,
      });
    } catch (error) {
      this.logger.error('Failed to post Jira ticket to Slack', error);
    }
  }

  /**
   * Generate impact badge based on user count or velocity
   */
  private getImpactBadge(group: {
    userCount?: number | null;
    velocityPerHour?: number | null;
    count: number;
  }): string | null {
    if (group.userCount && group.userCount >= 50) {
      return `🔴 *High Impact:* ${group.userCount} users affected`;
    }
    if (group.userCount && group.userCount >= 10) {
      return `🟠 *Medium Impact:* ${group.userCount} users affected`;
    }
    if (group.velocityPerHour && group.velocityPerHour >= 10) {
      return `⚡ *High Velocity:* ${group.velocityPerHour.toFixed(1)} occurrences/hour`;
    }
    if (group.count > 10) {
      return `🟡 ${group.count} total occurrences`;
    }
    return null;
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
      throw new AuthenticationException('Slack not connected for this workspace');
    }

    const group = await prisma.alertGroup.findFirst({
      where: { id: alertGroupId, workspaceId },
    });
    if (!group) {
      throw new ResourceNotFoundException('Alert group', alertGroupId);
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

    try {
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
    } catch (error) {
      throw new InternalServerException('Failed to send Slack alert to channel', {
        workspaceId,
        alertGroupId,
        channelId,
        error,
      });
    }
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
      throw new AuthenticationException('Slack not connected for this workspace');
    }

    const group = await prisma.alertGroup.findFirst({
      where: { id: alertGroupId, workspaceId },
    });
    if (!group) {
      throw new ResourceNotFoundException('Alert group', alertGroupId);
    }

    const client = new WebClient(token);
    const blocks = this.buildEscalationBlocks(group, escalationLevel);

    // Always mention for escalations
    const mention = mentionHere ? '<!here>' : '';
    const text = `${mention} 🚨 *ESCALATION (Level ${escalationLevel})* - ${group.title}`;

    try {
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
    } catch (error) {
      throw new InternalServerException('Failed to send Slack escalation', {
        workspaceId,
        alertGroupId,
        channelId,
        error,
      });
    }
  }

  private buildEscalationBlocks(
    group: {
      id: string;
      title: string;
      severity: string;
      environment: string;
      count: number;
      status: AlertStatus;
    },
    escalationLevel: number,
  ): AnyBlock[] {
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
