import { Injectable, Logger } from '@nestjs/common';
import { AlertStatus, IntegrationType } from '@signalcraft/database';
import { ExternalMappingsService } from './external-mappings.service';
import { PagerDutyService } from '../integrations/pagerduty.service';
import { OpsgenieService } from '../integrations/opsgenie.service';
import { JiraService } from '../integrations/jira.service';
import { DatadogService } from '../integrations/datadog.service';

@Injectable()
export class SyncManagerService {
  private readonly logger = new Logger(SyncManagerService.name);

  constructor(
    private readonly mappingsService: ExternalMappingsService,
    private readonly pagerDutyService: PagerDutyService,
    private readonly opsgenieService: OpsgenieService,
    private readonly jiraService: JiraService,
    private readonly datadogService: DatadogService,
  ) {}

  async handleAlertStatusChange(params: {
    workspaceId: string;
    alertGroupId: string;
    status: AlertStatus;
    source: string;
  }) {
    const mappings = await this.mappingsService.listByAlertGroup(params.alertGroupId);
    if (mappings.length === 0) {
      return;
    }

    const sourceIntegration = this.mapSourceToIntegration(params.source);

    await Promise.all(
      mappings.map(async (mapping: { integrationType: IntegrationType; externalId: string }) => {
        if (sourceIntegration && mapping.integrationType === sourceIntegration) {
          return;
        }

        try {
          await this.syncToIntegration({
            workspaceId: params.workspaceId,
            status: params.status,
            mapping,
          });
        } catch (error) {
          this.logger.warn('Failed to sync status to integration', {
            integrationType: mapping.integrationType,
            externalId: mapping.externalId,
            error,
          });
        }
      }),
    );
  }

  private async syncToIntegration(params: {
    workspaceId: string;
    status: AlertStatus;
    mapping: {
      integrationType: IntegrationType;
      externalId: string;
    };
  }) {
    switch (params.mapping.integrationType) {
      case IntegrationType.PAGERDUTY:
        if (params.status === AlertStatus.ACK) {
          await this.pagerDutyService.acknowledgeIncident(
            params.workspaceId,
            params.mapping.externalId,
          );
        }
        if (params.status === AlertStatus.RESOLVED) {
          await this.pagerDutyService.resolveIncident(
            params.workspaceId,
            params.mapping.externalId,
          );
        }
        return;
      case IntegrationType.OPSGENIE:
        if (params.status === AlertStatus.ACK) {
          await this.opsgenieService.acknowledgeAlert(
            params.workspaceId,
            params.mapping.externalId,
          );
        }
        if (params.status === AlertStatus.RESOLVED) {
          await this.opsgenieService.closeAlert(params.workspaceId, params.mapping.externalId);
        }
        return;
      case IntegrationType.JIRA:
        if (params.status === AlertStatus.ACK) {
          await this.jiraService.transitionIssue(params.workspaceId, params.mapping.externalId, [
            'In Progress',
            'Acknowledged',
            'Doing',
          ]);
        }
        if (params.status === AlertStatus.RESOLVED) {
          await this.jiraService.transitionIssue(params.workspaceId, params.mapping.externalId, [
            'Done',
            'Resolved',
            'Closed',
          ]);
        }
        return;
      case IntegrationType.DATADOG:
        if (params.status === AlertStatus.ACK) {
          await this.datadogService.updateIncidentStatus(
            params.workspaceId,
            params.mapping.externalId,
            'stable',
          );
        }
        if (params.status === AlertStatus.RESOLVED) {
          await this.datadogService.updateIncidentStatus(
            params.workspaceId,
            params.mapping.externalId,
            'resolved',
          );
        }
        return;
      default:
        return;
    }
  }

  private mapSourceToIntegration(source: string): IntegrationType | null {
    const normalized = source.toLowerCase();
    if (normalized.startsWith('integration:')) {
      const name = normalized.replace('integration:', '');
      switch (name) {
        case 'pagerduty':
          return IntegrationType.PAGERDUTY;
        case 'opsgenie':
          return IntegrationType.OPSGENIE;
        case 'jira':
          return IntegrationType.JIRA;
        case 'datadog':
          return IntegrationType.DATADOG;
        case 'grafana':
          return IntegrationType.GRAFANA;
        case 'prometheus':
          return IntegrationType.PROMETHEUS;
        case 'sentry':
          return IntegrationType.SENTRY;
        default:
          return null;
      }
    }
    return null;
  }
}
