import { Module } from '@nestjs/common';
import { NotificationLogService } from './notification-log.service';
import { SlackNotificationService } from './slack-notification.service';
import { NotificationProcessor } from './notification.processor';
import { IntegrationsModule } from '../integrations/integrations.module';
import { SyncModule } from '../sync/sync.module';
import { NotificationsController } from './notifications.controller';
import { TwilioWebhookController } from './twilio-webhook.controller';
import { AiModule } from '../ai/ai.module';
import { AlertsModule } from '../alerts/alerts.module';
import { forwardRef } from '@nestjs/common';
import { EmailNotificationService } from './email-notification.service';
import { WebhookDispatcherService } from './webhook-dispatcher.service';
import { TwilioNotificationService } from './twilio-notification.service';
import { TeamsNotificationService } from './teams-notification.service';
import { DiscordNotificationService } from './discord-notification.service';

@Module({
  imports: [IntegrationsModule, SyncModule, AiModule, forwardRef(() => AlertsModule)],
  controllers: [NotificationsController, TwilioWebhookController],
  providers: [
    NotificationLogService,
    SlackNotificationService,
    NotificationProcessor,
    EmailNotificationService,
    TwilioNotificationService,
    WebhookDispatcherService,
    TeamsNotificationService,
    DiscordNotificationService,
  ],
  exports: [
    SlackNotificationService,
    NotificationLogService,
    EmailNotificationService,
    TwilioNotificationService,
    WebhookDispatcherService,
    TeamsNotificationService,
    DiscordNotificationService,
  ],
})
export class NotificationsModule {}
