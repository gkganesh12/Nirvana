import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@signalcraft/database';
import axios from 'axios';

interface PagerDutyConfig {
  apiKey: string;
  serviceId: string; // Default service for incidents
}

interface CreateIncidentDto {
  title: string;
  description: string;
  urgency: 'high' | 'low';
  alertId: string;
  severity: string;
}

@Injectable()
export class PagerDutyService {
  private readonly logger = new Logger(PagerDutyService.name);
  private readonly apiUrl = 'https://api.pagerduty.com';

  /**
   * Create an incident in PagerDuty
   */
  async createIncident(
    workspaceId: string,
    dto: CreateIncidentDto,
  ): Promise<{ success: boolean; incidentId?: string; error?: string }> {
    try {
      // Get PagerDuty config for workspace (from Integration table)
      const integration = await prisma.integration.findFirst({
        where: {
          workspaceId,
          type: 'PAGERDUTY', // We'll need to add this enum value
          status: 'ACTIVE',
        },
      });

      if (!integration || !integration.configJson) {
        return { success: false, error: 'PagerDuty not configured' };
      }

      const config = integration.configJson as any;
      const apiKey = config.apiKey;
      const serviceId = config.serviceId;

      // Map severity to urgency
      const urgency = ['CRITICAL', 'HIGH'].includes(dto.severity) ? 'high' : 'low';

      // Create incident via PagerDuty Events API v2
      const response = await axios.post(
        `${this.apiUrl}/incidents`,
        {
          incident: {
            type: 'incident',
            title: dto.title,
            service: {
              id: serviceId,
              type: 'service_reference',
            },
            urgency,
            body: {
              type: 'incident_body',
              details: dto.description,
            },
          },
        },
        {
          headers: {
            Authorization: `Token token=${apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/vnd.pagerduty+json;version=2',
          },
        },
      );

      const incidentId = response.data.incident.id;
      this.logger.log(`PagerDuty incident created: ${incidentId} for alert ${dto.alertId}`);

      return { success: true, incidentId };
    } catch (error: any) {
      this.logger.error(
        'Failed to create PagerDuty incident:',
        error.response?.data || error.message,
      );
      return { success: false, error: error.message };
    }
  }

  async createIncidentFromAlert(
    workspaceId: string,
    alertGroupId: string,
  ): Promise<{ success: boolean; incidentId?: string; error?: string }> {
    const alert = await prisma.alertGroup.findFirst({
      where: { id: alertGroupId, workspaceId },
    });
    if (!alert) {
      return { success: false, error: 'Alert not found' };
    }

    return this.createIncident(workspaceId, {
      title: alert.title,
      description: `SignalCraft alert ${alert.id} - ${alert.title}`,
      alertId: alert.id,
      severity: alert.severity,
      urgency: ['CRITICAL', 'HIGH'].includes(alert.severity) ? 'high' : 'low',
    });
  }

  async acknowledgeIncident(workspaceId: string, incidentId: string) {
    await this.updateIncidentStatus(workspaceId, incidentId, 'acknowledged');
  }

  async resolveIncident(workspaceId: string, incidentId: string) {
    await this.updateIncidentStatus(workspaceId, incidentId, 'resolved');
  }

  private async updateIncidentStatus(
    workspaceId: string,
    incidentId: string,
    status: 'acknowledged' | 'resolved',
  ) {
    const integration = await prisma.integration.findFirst({
      where: {
        workspaceId,
        type: 'PAGERDUTY',
        status: 'ACTIVE',
      },
    });

    if (!integration || !integration.configJson) {
      this.logger.warn('PagerDuty not configured', { workspaceId });
      return;
    }

    const config = integration.configJson as any;
    const apiKey = config.apiKey;

    if (!apiKey) {
      this.logger.warn('PagerDuty API key missing', { workspaceId });
      return;
    }

    await axios.put(
      `${this.apiUrl}/incidents/${incidentId}`,
      {
        incident: {
          type: 'incident',
          status,
        },
      },
      {
        headers: {
          Authorization: `Token token=${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.pagerduty+json;version=2',
        },
      },
    );
  }

  /**
   * Test PagerDuty connection
   */
  async testConnection(
    apiKey: string,
    serviceId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify API key by fetching service details
      const response = await axios.get(`${this.apiUrl}/services/${serviceId}`, {
        headers: {
          Authorization: `Token token=${apiKey}`,
          Accept: 'application/vnd.pagerduty+json;version=2',
        },
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error?.message || error.message };
    }
  }

  /**
   * Get all services for a PagerDuty account
   */
  async getServices(apiKey: string): Promise<any[]> {
    try {
      const response = await axios.get(`${this.apiUrl}/services`, {
        headers: {
          Authorization: `Token token=${apiKey}`,
          Accept: 'application/vnd.pagerduty+json;version=2',
        },
        params: {
          limit: 100,
        },
      });

      return response.data.services;
    } catch (error) {
      this.logger.error('Failed to fetch PagerDuty services:', error);
      return [];
    }
  }
}
