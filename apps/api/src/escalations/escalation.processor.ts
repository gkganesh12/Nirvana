/**
 * Escalation Processor
 * 
 * BullMQ worker that processes escalation jobs.
 * Checks if alerts are still unacknowledged and sends escalation notifications.
 * 
 * @module escalations/escalation.processor
 */
import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { prisma } from '@signalcraft/database';
import { EscalationJobData } from '@signalcraft/shared';
import { EscalationService } from './escalation.service';
import { SlackNotificationService } from '../notifications/slack-notification.service';
import { NotificationLogService } from '../notifications/notification-log.service';

@Injectable()
export class EscalationProcessor implements OnModuleDestroy {
    private readonly logger = new Logger(EscalationProcessor.name);
    private readonly worker: Worker | null = null;

    constructor(
        private readonly escalationService: EscalationService,
        private readonly slackNotificationService: SlackNotificationService,
        private readonly notificationLogService: NotificationLogService,
    ) {
        const redisUrl = process.env.REDIS_URL;
        if (!redisUrl) {
            this.logger.warn('Redis URL not configured - escalation processor disabled');
            return;
        }

        const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

        this.worker = new Worker(
            'escalations',
            async (job) => {
                const data = job.data as EscalationJobData;
                await this.processEscalation(data);
            },
            {
                connection,
                concurrency: 5,
            },
        );

        this.worker.on('completed', (job) => {
            this.logger.debug(`Escalation job completed`, { jobId: job.id });
        });

        this.worker.on('failed', (job, error) => {
            this.logger.error(`Escalation job failed`, {
                jobId: job?.id,
                error: error.message,
            });
        });

        this.logger.log('Escalation processor initialized');
    }

    async onModuleDestroy() {
        if (this.worker) {
            await this.worker.close();
            this.logger.log('Escalation processor shut down');
        }
    }

    /**
     * Process a single escalation job
     */
    private async processEscalation(data: EscalationJobData): Promise<void> {
        const { workspaceId, alertGroupId, escalationLevel, channelId, mentionHere } = data;

        this.logger.log(`Processing escalation`, {
            alertGroupId,
            level: escalationLevel,
        });

        // Check if escalation is still needed
        const shouldEscalate = await this.escalationService.shouldEscalate(alertGroupId);
        if (!shouldEscalate) {
            this.logger.log(`Escalation cancelled - alert already handled`, { alertGroupId });
            return;
        }

        // Get alert group details
        const alertGroup = await prisma.alertGroup.findUnique({
            where: { id: alertGroupId },
        });

        if (!alertGroup) {
            this.logger.warn(`Alert group not found`, { alertGroupId });
            return;
        }

        try {
            // Send escalation notification
            await this.sendEscalationNotification(
                workspaceId,
                alertGroupId,
                channelId,
                escalationLevel,
                mentionHere,
            );

            // Log successful notification
            await this.notificationLogService.logSuccess(workspaceId, channelId, alertGroupId);

            // Schedule next level escalation
            await this.escalationService.scheduleNextLevel(
                workspaceId,
                alertGroupId,
                escalationLevel,
                channelId,
                data.escalateAfterMinutes,
            );
        } catch (error) {
            this.logger.error(`Escalation notification failed`, {
                alertGroupId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });

            await this.notificationLogService.logFailure(
                workspaceId,
                channelId,
                alertGroupId,
                error instanceof Error ? error.message : 'Unknown error',
            );

            throw error; // Re-throw to trigger BullMQ retry
        }
    }

    /**
     * Send escalation notification to Slack
     */
    private async sendEscalationNotification(
        workspaceId: string,
        alertGroupId: string,
        channelId: string,
        escalationLevel: number,
        mentionHere: boolean,
    ): Promise<void> {
        // Build escalation message
        const alertGroup = await prisma.alertGroup.findUnique({
            where: { id: alertGroupId },
        });

        if (!alertGroup) {
            throw new Error(`Alert group not found: ${alertGroupId}`);
        }

        // Use existing notification service but add escalation context
        await this.slackNotificationService.sendEscalation(
            workspaceId,
            alertGroupId,
            channelId,
            escalationLevel,
            mentionHere,
        );

        this.logger.log(`Escalation notification sent`, {
            alertGroupId,
            level: escalationLevel,
            channelId,
        });
    }
}
