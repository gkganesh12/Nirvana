import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@signalcraft/database';
import { WebhookDispatcherService } from './webhook-dispatcher.service';

@Injectable()
export class DiscordNotificationService {
  private readonly logger = new Logger(DiscordNotificationService.name);

  constructor(private readonly webhookDispatcher: WebhookDispatcherService) {}

  async sendAlert(workspaceId: string, alertGroupId: string) {
    const integration = await prisma.integration.findFirst({
      where: {
        workspaceId,
        type: 'DISCORD' as any,
        status: 'ACTIVE',
      },
    });

    if (!integration) {
      throw new Error('Discord not configured');
    }

    const config = integration.configJson as { webhookUrl?: string };
    if (!config.webhookUrl) {
      throw new Error('Discord webhook URL missing');
    }

    const group = await prisma.alertGroup.findFirst({
      where: { id: alertGroupId, workspaceId },
    });
    if (!group) {
      throw new Error('Alert group not found');
    }

    const baseUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
    const alertUrl = `${baseUrl}/dashboard/alerts/${alertGroupId}`;

    const payload = {
      content: `🚨 **${group.title}**`,
      embeds: [
        {
          title: `View alert`,
          url: alertUrl,
          color: this.getSeverityColor(group.severity),
          fields: [
            { name: 'Severity', value: group.severity, inline: true },
            { name: 'Environment', value: group.environment, inline: true },
            { name: 'Project', value: group.project, inline: true },
            { name: 'Status', value: group.status, inline: true },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };

    await this.webhookDispatcher.dispatch(config.webhookUrl, payload);
    return { targetRef: 'discord', alertGroupId };
  }

  private getSeverityColor(severity: string) {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return 0xdc2626;
      case 'HIGH':
        return 0xf97316;
      case 'MEDIUM':
        return 0xf59e0b;
      case 'LOW':
        return 0x3b82f6;
      default:
        return 0x71717a;
    }
  }
}
