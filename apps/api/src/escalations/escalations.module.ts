/**
 * Escalations Module
 * 
 * Provides escalation scheduling and processing functionality.
 * 
 * @module escalations/escalations.module
 */
import { Module, forwardRef } from '@nestjs/common';
import { EscalationService } from './escalation.service';
import { EscalationProcessor } from './escalation.processor';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [forwardRef(() => NotificationsModule)],
    providers: [EscalationService, EscalationProcessor],
    exports: [EscalationService],
})
export class EscalationsModule { }
