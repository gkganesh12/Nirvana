/**
 * Escalation Service
 * 
 * Handles scheduling and managing alert escalations.
 * When alerts are not acknowledged within a configured time,
 * this service re-notifies with escalated priority.
 * 
 * @module escalations/escalation.service
 */
import { Injectable, Logger } from '@nestjs/common';
import { Queue, Job } from 'bullmq';
import Redis from 'ioredis';
import { prisma, AlertStatus } from '@signalcraft/database';
import { EscalationJobData, RuleActions } from '@signalcraft/shared';

// Map to track scheduled escalation jobs by alert group ID
const escalationJobs = new Map<string, string>();

@Injectable()
export class EscalationService {
    private readonly logger = new Logger(EscalationService.name);
    private readonly queue: Queue | null = null;

    constructor() {
        const redisUrl = process.env.REDIS_URL;
        if (redisUrl) {
            const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
            this.queue = new Queue('escalations', { connection });
            this.logger.log('Escalation queue initialized');
        } else {
            this.logger.warn('Redis URL not configured - escalations disabled');
        }
    }

    /**
     * Schedule an escalation check for an alert group
     */
    async scheduleEscalation(
        workspaceId: string,
        alertGroupId: string,
        actions: RuleActions,
        originalNotificationTs?: string,
    ): Promise<string | null> {
        if (!this.queue) {
            this.logger.warn('Escalation queue not available');
            return null;
        }

        const { escalateAfterMinutes, escalationChannelId, slackChannelId, escalationMentionHere } =
            actions;

        if (!escalateAfterMinutes || escalateAfterMinutes < 1) {
            return null; // No escalation configured
        }

        const delayMs = escalateAfterMinutes * 60 * 1000;
        const channelId = escalationChannelId || slackChannelId;

        const jobData: EscalationJobData = {
            workspaceId,
            alertGroupId,
            escalationLevel: 1,
            escalateAfterMinutes,
            channelId,
            mentionHere: escalationMentionHere ?? true,
            originalNotificationTs,
            scheduledAt: new Date(),
        };

        const job = await this.queue.add('escalation-check', jobData, {
            delay: delayMs,
            removeOnComplete: true,
            removeOnFail: false,
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000,
            },
        });

        // Track the job ID for potential cancellation
        escalationJobs.set(alertGroupId, job.id as string);

        this.logger.log(`Escalation scheduled`, {
            workspaceId,
            alertGroupId,
            escalateAfterMinutes,
            jobId: job.id,
        });

        return job.id as string;
    }

    /**
     * Cancel a pending escalation for an alert group
     * Called when alert is acknowledged or resolved
     */
    async cancelEscalation(alertGroupId: string): Promise<boolean> {
        if (!this.queue) {
            return false;
        }

        const jobId = escalationJobs.get(alertGroupId);
        if (!jobId) {
            return false; // No escalation job found
        }

        try {
            const job = await this.queue.getJob(jobId);
            if (job) {
                await job.remove();
                this.logger.log(`Escalation cancelled`, { alertGroupId, jobId });
            }
            escalationJobs.delete(alertGroupId);
            return true;
        } catch (error) {
            this.logger.warn(`Failed to cancel escalation`, { alertGroupId, jobId, error });
            return false;
        }
    }

    /**
     * Check if an alert group should be escalated
     */
    async shouldEscalate(alertGroupId: string): Promise<boolean> {
        const group = await prisma.alertGroup.findUnique({
            where: { id: alertGroupId },
        });

        if (!group) {
            this.logger.warn(`Alert group not found for escalation check`, { alertGroupId });
            return false;
        }

        // Don't escalate if already acknowledged or resolved
        if (group.status === AlertStatus.ACK || group.status === AlertStatus.RESOLVED) {
            this.logger.debug(`Alert already handled, skipping escalation`, {
                alertGroupId,
                status: group.status,
            });
            return false;
        }

        // Don't escalate if snoozed and snooze hasn't expired
        if (group.status === AlertStatus.SNOOZED && group.snoozeUntil) {
            if (new Date() < group.snoozeUntil) {
                this.logger.debug(`Alert snoozed, skipping escalation`, {
                    alertGroupId,
                    snoozeUntil: group.snoozeUntil,
                });
                return false;
            }
        }

        return true;
    }

    /**
     * Schedule next level escalation (for multi-level escalation)
     */
    async scheduleNextLevel(
        workspaceId: string,
        alertGroupId: string,
        currentLevel: number,
        channelId: string,
        escalateAfterMinutes: number,
    ): Promise<string | null> {
        if (!this.queue) {
            return null;
        }

        const maxLevel = 3; // Maximum escalation levels
        if (currentLevel >= maxLevel) {
            this.logger.log(`Maximum escalation level reached`, { alertGroupId, currentLevel });
            return null;
        }

        const delayMs = escalateAfterMinutes * 60 * 1000;

        const jobData: EscalationJobData = {
            workspaceId,
            alertGroupId,
            escalationLevel: currentLevel + 1,
            escalateAfterMinutes,
            channelId,
            mentionHere: true,
            scheduledAt: new Date(),
        };

        const job = await this.queue.add('escalation-check', jobData, {
            delay: delayMs,
            removeOnComplete: true,
            removeOnFail: false,
            attempts: 3,
        });

        escalationJobs.set(alertGroupId, job.id as string);

        this.logger.log(`Next level escalation scheduled`, {
            alertGroupId,
            level: currentLevel + 1,
            jobId: job.id,
        });

        return job.id as string;
    }

    /**
     * Get escalation status for an alert group
     */
    async getEscalationStatus(alertGroupId: string): Promise<{
        hasScheduledEscalation: boolean;
        jobId?: string;
    }> {
        const jobId = escalationJobs.get(alertGroupId);
        if (!jobId) {
            return { hasScheduledEscalation: false };
        }

        if (!this.queue) {
            return { hasScheduledEscalation: false };
        }

        const job = await this.queue.getJob(jobId);
        return {
            hasScheduledEscalation: !!job,
            jobId,
        };
    }

    /**
     * Cancel all escalations for a workspace (used when integration is disconnected)
     */
    async cancelAllWorkspaceEscalations(workspaceId: string): Promise<number> {
        if (!this.queue) {
            return 0;
        }

        let cancelledCount = 0;

        // Get all alert groups for the workspace with pending escalations
        for (const [alertGroupId, jobId] of escalationJobs.entries()) {
            try {
                const job = await this.queue.getJob(jobId);
                if (job) {
                    const data = job.data as EscalationJobData;
                    if (data.workspaceId === workspaceId) {
                        await job.remove();
                        escalationJobs.delete(alertGroupId);
                        cancelledCount++;
                    }
                }
            } catch (error) {
                this.logger.warn(`Failed to cancel escalation job`, { jobId, error });
            }
        }

        this.logger.log(`Cancelled workspace escalations`, { workspaceId, count: cancelledCount });
        return cancelledCount;
    }
}
