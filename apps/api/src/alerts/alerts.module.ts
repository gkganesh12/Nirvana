import { Module, forwardRef } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { NormalizationService } from './normalization.service';
import { GroupingService } from './grouping.service';
import { AlertProcessorService } from './alert-processor.service';
import { QueueModule } from '../queues/queue.module';
import { HygieneService } from './hygiene/hygiene.service';
import { HygieneController } from './hygiene/hygiene.controller';
import { HygieneSchedulerService } from './hygiene/hygiene-scheduler.service';
import { HygieneProcessor } from './hygiene/hygiene.processor';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { CorrelationService } from './correlation.service';
import { CorrelationRulesController } from './correlation-rules.controller';
import { EscalationsModule } from '../escalations/escalations.module';
import { RoutingModule } from '../routing/routing.module';
import { AiModule } from '../ai/ai.module';
import { AuditModule } from '../audit/audit.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReleasesModule } from '../releases/releases.module';
import { ChangeEventsModule } from '../change-events/change-events.module';
import { EscalationPoliciesModule } from '../escalation-policies/escalation-policies.module';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [
    QueueModule,
    forwardRef(() => EscalationsModule),
    forwardRef(() => RoutingModule),
    forwardRef(() => IntegrationsModule),
    forwardRef(() => NotificationsModule),
    ReleasesModule,
    ChangeEventsModule,
    EscalationPoliciesModule,
    SyncModule,
    AiModule,
    AuditModule,
  ],
  controllers: [AlertsController, HygieneController, CorrelationRulesController],
  providers: [
    AlertsService,
    NormalizationService,
    GroupingService,
    AlertProcessorService,
    HygieneService,
    HygieneSchedulerService,
    HygieneProcessor,
    AnomalyDetectionService,
    CorrelationService,
  ],
  exports: [
    AlertProcessorService,
    AlertsService,
    NormalizationService,
    HygieneService,
    CorrelationService,
  ],
})
export class AlertsModule { }
