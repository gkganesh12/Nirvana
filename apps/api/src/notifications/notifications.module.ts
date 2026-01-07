import { Module } from '@nestjs/common';
import { NotificationLogService } from './notification-log.service';
import { SlackNotificationService } from './slack-notification.service';
import { NotificationProcessor } from './notification.processor';
import { IntegrationsModule } from '../integrations/integrations.module';
import { NotificationsController } from './notifications.controller';
import { AiModule } from '../ai/ai.module';
import { AlertsModule } from '../alerts/alerts.module';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [
    IntegrationsModule,
    AiModule,
    forwardRef(() => AlertsModule),
  ],
  controllers: [NotificationsController],
  providers: [NotificationLogService, SlackNotificationService, NotificationProcessor],
  exports: [SlackNotificationService, NotificationLogService],
})
export class NotificationsModule { }
