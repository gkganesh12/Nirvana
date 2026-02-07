import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { validateEnv } from './config/validate-env';
import path from 'path';
import { QueueModule } from './queues/queue.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { AlertsModule } from './alerts/alerts.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RoutingModule } from './routing/routing.module';
import { EscalationsModule } from './escalations/escalations.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SettingsModule } from './settings/settings.module';
import { JobsModule } from './jobs/jobs.module';
import { ReleasesModule } from './releases/releases.module';
import { UptimeModule } from './uptime/uptime.module';
import { SessionReplayModule } from './session-replay/session-replay.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { AuditModule } from './audit/audit.module';
import { EncryptionModule } from './common/encryption/encryption.module';
import { SecretsModule } from './common/secrets/secrets.module';
import { EventsModule } from './common/websocket/events.module';
import { SamlModule } from './saml/saml.module';
import { PermissionsModule } from './permissions/permissions.module';
import { InvitationsModule } from './invitations/invitations.module';
import { WorkflowModule } from './workflows/workflow.module';
import { CorrelationModule } from './correlation/correlation.module';
import { CustomDashboardModule } from './dashboards/dashboard.module';
import { OnCallModule } from './oncall/oncall.module';
import { PagingModule } from './paging/paging.module';
import { StatusPagesModule } from './status-pages/status-pages.module';
import { ChangeEventsModule } from './change-events/change-events.module';
import { ChatOpsModule } from './chatops/chatops.module';
import { ServiceAccountsModule } from './service-accounts/service-accounts.module';
import { IdempotencyModule } from './common/idempotency/idempotency.module';
import { IdempotencyInterceptor } from './common/idempotency/idempotency.interceptor';
import { TeamsModule } from './teams/teams.module';
import { EscalationPoliciesModule } from './escalation-policies/escalation-policies.module';
import { AlertPoliciesModule } from './alert-policies/alert-policies.module';
import { SyncModule } from './sync/sync.module';
import { IncidentsModule } from './incidents/incidents.module';

import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: [path.resolve(process.cwd(), '.env'), path.resolve(process.cwd(), '../../.env')],
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : {
              target: 'pino-pretty',
              options: { colorize: true, singleLine: true },
            },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.token',
          ],
          remove: true,
        },
        autoLogging: true,
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    HealthModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    QueueModule,
    WebhooksModule,
    AlertsModule,
    IntegrationsModule,
    NotificationsModule,
    RoutingModule,
    EscalationsModule,
    DashboardModule,
    SettingsModule,
    JobsModule,
    ReleasesModule,
    UptimeModule,
    SessionReplayModule,
    ApiKeysModule,
    AuditModule,
    EncryptionModule,
    SecretsModule,
    EventsModule,
    SamlModule,
    PermissionsModule,
    InvitationsModule,
    WorkflowModule,
    CorrelationModule,
    CustomDashboardModule,
    OnCallModule,
    PagingModule,
    StatusPagesModule,
    ChangeEventsModule,
    ChatOpsModule,
    ServiceAccountsModule,
    IdempotencyModule,
    TeamsModule,
    EscalationPoliciesModule,
    AlertPoliciesModule,
    SyncModule,
    IncidentsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
})
export class AppModule { }
