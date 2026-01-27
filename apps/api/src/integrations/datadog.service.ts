import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@signalcraft/database';
import axios from 'axios';

interface DatadogConfig {
  apiKey: string;
  appKey: string;
  site?: string;
}

@Injectable()
export class DatadogService {
  private readonly logger = new Logger(DatadogService.name);

  private buildApiUrl(site?: string) {
    const domain = site && site.length > 0 ? site : 'datadoghq.com';
    return `https://api.${domain}`;
  }

  async updateIncidentStatus(
    workspaceId: string,
    incidentId: string,
    status: 'stable' | 'resolved' | 'active',
  ) {
    const integration = await prisma.integration.findFirst({
      where: { workspaceId, type: 'DATADOG' as any, status: 'ACTIVE' },
    });

    if (!integration?.configJson) {
      this.logger.warn('Datadog integration not configured', { workspaceId });
      return;
    }

    const config = integration.configJson as unknown as DatadogConfig;
    if (!config.apiKey || !config.appKey) {
      this.logger.warn('Datadog API keys missing', { workspaceId });
      return;
    }

    const apiUrl = this.buildApiUrl(config.site);

    try {
      await axios.patch(
        `${apiUrl}/api/v2/incidents/${incidentId}`,
        {
          data: {
            type: 'incidents',
            attributes: {
              status,
            },
          },
        },
        {
          headers: {
            'DD-API-KEY': config.apiKey,
            'DD-APPLICATION-KEY': config.appKey,
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error: any) {
      this.logger.warn('Failed to update Datadog incident status', {
        incidentId,
        error: error.response?.data || error.message,
      });
    }
  }
}
