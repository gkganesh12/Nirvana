import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@signalcraft/database';
import { WebhookDispatcherService } from './webhook-dispatcher.service';

@Injectable()
export class TeamsNotificationService {
  private readonly logger = new Logger(TeamsNotificationService.name);

  constructor(private readonly webhookDispatcher: WebhookDispatcherService) {}

  async sendAlert(workspaceId: string, alertGroupId: string) {
    const integration = await prisma.integration.findFirst({
      where: {
        workspaceId,
        type: 'TEAMS' as any,
        status: 'ACTIVE',
      },
    });

    if (!integration) {
      throw new Error('Microsoft Teams not configured');
    }

    const config = integration.configJson as { webhookUrl?: string };
    if (!config.webhookUrl) {
      throw new Error('Teams webhook URL missing');
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
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: `SignalCraft Alert: ${group.title}`,
      themeColor: this.getSeverityColor(group.severity),
      title: `🚨 ${group.title}`,
      sections: [
        {
          facts: [
            { name: 'Severity', value: group.severity },
            { name: 'Environment', value: group.environment },
            { name: 'Project', value: group.project },
            { name: 'Status', value: group.status },
          ],
          text: group.title,
        },
      ],
      potentialAction: [
        {
          '@type': 'OpenUri',
          name: 'View Alert',
          targets: [{ os: 'default', uri: alertUrl }],
        },
      ],
    };

    await this.webhookDispatcher.dispatch(config.webhookUrl, payload);
    return { targetRef: 'teams', alertGroupId };
  }

  private getSeverityColor(severity: string) {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return 'C50F1F';
      case 'HIGH':
        return 'D83B01';
      case 'MEDIUM':
        return 'FFAA44';
      case 'LOW':
        return '0078D4';
      default:
        return '605E5C';
    }
  }
}
