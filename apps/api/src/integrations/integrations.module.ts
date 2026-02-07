import { Module, forwardRef } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { SlackController } from './slack.controller';
import { PagerDutyService } from './pagerduty.service';
import { PagerDutyController } from './pagerduty.controller';
import { OpsgenieService } from './opsgenie.service';
import { OpsgenieController } from './opsgenie.controller';
import { JiraService } from './jira.service';
import { JiraController } from './jira.controller';
import { JiraOAuthController } from './jira-oauth.controller';
import { TeamsController } from './teams.controller';
import { DiscordController } from './discord.controller';
import { WebhookIngestionService } from './webhooks/webhook-ingestion.service';
import { WebhooksController } from './webhooks/webhooks.controller';
import { AwsCloudWatchStrategy } from './webhooks/strategies/aws-cloudwatch.strategy';
import { PrometheusStrategy } from './webhooks/strategies/prometheus.strategy';
import { GrafanaWebhookStrategy } from './webhooks/strategies/grafana.strategy';
import { AzureMonitorStrategy } from './webhooks/strategies/azure-monitor.strategy';
import { GcpMonitoringStrategy } from './webhooks/strategies/gcp-monitoring.strategy';
import { GenericWebhookStrategy } from './webhooks/strategies/generic-webhook.strategy';
import { WebhookRegistryService } from './webhooks/webhook-registry.service';
import { WebhookManagementController } from './webhooks/webhook-management.controller';
import { DatadogService } from './datadog.service';

import { SlackService } from './slack/slack.service';
import { SlackOAuthService } from './slack/oauth.service';

@Module({
  imports: [forwardRef(() => AlertsModule)],
  controllers: [
    IntegrationsController,
    WebhooksController,
    WebhookManagementController,
    SlackController,
    PagerDutyController,
    OpsgenieController,
    JiraController,
    JiraOAuthController,
    TeamsController,
    DiscordController,
  ],
  providers: [
    IntegrationsService,
    WebhookIngestionService,
    WebhookRegistryService,
    AwsCloudWatchStrategy,
    PrometheusStrategy,
    GrafanaWebhookStrategy,
    AzureMonitorStrategy,
    GcpMonitoringStrategy,
    GenericWebhookStrategy,
    PagerDutyService,
    OpsgenieService,
    SlackService,
    SlackOAuthService,
    JiraService,
    DatadogService,
  ],
  exports: [
    IntegrationsService,
    PagerDutyService,
    OpsgenieService,
    SlackService,
    SlackOAuthService,
    JiraService,
    DatadogService,
  ],
})
export class IntegrationsModule { }
