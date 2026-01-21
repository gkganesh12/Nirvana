import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { prisma, IntegrationType, IntegrationStatus } from '@signalcraft/database';
import { WebClient } from '@slack/web-api';

interface CreateUptimeCheckDto {
    name: string;
    url: string;
    method?: string;
    interval?: number;
    timeout?: number;
    headers?: Record<string, string>;
    expectedStatus?: number;
}

interface UpdateUptimeCheckDto {
    name?: string;
    url?: string;
    method?: string;
    interval?: number;
    timeout?: number;
    enabled?: boolean;
    headers?: Record<string, string>;
    expectedStatus?: number;
}

export interface UptimeCheckWithStats {
    id: string;
    name: string;
    url: string;
    method: string;
    interval: number;
    enabled: boolean;
    lastStatus: string | null;
    lastCheckedAt: Date | null;
    uptimePercentage: number;
    avgResponseTime: number | null;
}

@Injectable()
export class UptimeService {
    private readonly logger = new Logger(UptimeService.name);

    async createCheck(workspaceId: string, dto: CreateUptimeCheckDto) {
        return prisma.uptimeCheck.create({
            data: {
                workspaceId,
                name: dto.name,
                url: dto.url,
                method: dto.method ?? 'GET',
                interval: dto.interval ?? 60,
                timeout: dto.timeout ?? 30,
                headers: dto.headers ?? undefined,
                expectedStatus: dto.expectedStatus ?? null,
            },
        });
    }

    async updateCheck(workspaceId: string, checkId: string, dto: UpdateUptimeCheckDto) {
        return prisma.uptimeCheck.updateMany({
            where: { id: checkId, workspaceId },
            data: dto,
        });
    }

    async deleteCheck(workspaceId: string, checkId: string) {
        return prisma.uptimeCheck.deleteMany({
            where: { id: checkId, workspaceId },
        });
    }

    async listChecks(workspaceId: string): Promise<UptimeCheckWithStats[]> {
        const checks = await prisma.uptimeCheck.findMany({
            where: { workspaceId },
            orderBy: { createdAt: 'desc' },
            include: {
                results: {
                    take: 1,
                    orderBy: { checkedAt: 'desc' },
                },
            },
        });

        // Calculate stats for each check
        const result: UptimeCheckWithStats[] = [];

        for (const check of checks) {
            // Get last 24h results for uptime calculation
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const recentResults = await prisma.uptimeResult.findMany({
                where: {
                    uptimeCheckId: check.id,
                    checkedAt: { gte: dayAgo },
                },
                select: { status: true, responseTime: true },
            });

            const totalChecks = recentResults.length;
            const upChecks = recentResults.filter((r) => r.status === 'up').length;
            const uptimePercentage = totalChecks > 0 ? (upChecks / totalChecks) * 100 : 100;

            const responseTimes = recentResults
                .filter((r) => r.responseTime !== null)
                .map((r) => r.responseTime!);
            const avgResponseTime =
                responseTimes.length > 0
                    ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
                    : null;

            result.push({
                id: check.id,
                name: check.name,
                url: check.url,
                method: check.method,
                interval: check.interval,
                enabled: check.enabled,
                lastStatus: check.results[0]?.status ?? null,
                lastCheckedAt: check.results[0]?.checkedAt ?? null,
                uptimePercentage: Math.round(uptimePercentage * 10) / 10,
                avgResponseTime,
            });
        }

        return result;
    }

    async getCheckHistory(workspaceId: string, checkId: string, hours = 24) {
        const since = new Date(Date.now() - hours * 60 * 60 * 1000);

        const check = await prisma.uptimeCheck.findFirst({
            where: { id: checkId, workspaceId },
        });

        if (!check) return null;

        const results = await prisma.uptimeResult.findMany({
            where: {
                uptimeCheckId: checkId,
                checkedAt: { gte: since },
            },
            orderBy: { checkedAt: 'desc' },
            take: 100,
        });

        return { check, results };
    }

    // Execute a single uptime check
    async executeCheck(checkId: string): Promise<void> {
        const check = await prisma.uptimeCheck.findUnique({
            where: { id: checkId },
        });

        if (!check || !check.enabled) return;

        const startTime = Date.now();
        let status = 'up';
        let statusCode: number | null = null;
        let errorMessage: string | null = null;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), check.timeout * 1000);

            const headers: Record<string, string> = {
                'User-Agent': 'SignalCraft-Uptime/1.0',
                ...(check.headers as Record<string, string> ?? {}),
            };

            const response = await fetch(check.url, {
                method: check.method,
                headers,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            statusCode = response.status;

            // Check if status matches expected
            if (check.expectedStatus) {
                status = response.status === check.expectedStatus ? 'up' : 'down';
            } else {
                // Default: 2xx is up, anything else is down
                status = response.ok ? 'up' : 'down';
            }

            // Mark as degraded if response time > 3 seconds
            const responseTime = Date.now() - startTime;
            if (status === 'up' && responseTime > 3000) {
                status = 'degraded';
            }
        } catch (error: any) {
            status = 'down';
            errorMessage = error.message || 'Request failed';
            this.logger.warn(`Uptime check failed for ${check.name}: ${errorMessage}`);
        }

        const responseTime = Date.now() - startTime;

        // Save result
        await prisma.uptimeResult.create({
            data: {
                uptimeCheckId: checkId,
                status,
                responseTime,
                statusCode,
                errorMessage,
            },
        });

        // Check for status changes and send notifications
        const lastResult = await prisma.uptimeResult.findFirst({
            where: { uptimeCheckId: checkId },
            orderBy: { checkedAt: 'desc' },
            skip: 1,
        });

        if (lastResult && lastResult.status !== status) {
            this.logger.log(`Uptime status changed for ${check.name}: ${lastResult.status} → ${status}`);

            // Send Slack notification on status change
            await this.sendStatusChangeNotification(
                check.workspaceId,
                check.name,
                check.url,
                lastResult.status,
                status,
                errorMessage,
                responseTime
            );
        }
    }

    // Send Slack notification when uptime status changes
    private async sendStatusChangeNotification(
        workspaceId: string,
        checkName: string,
        checkUrl: string,
        previousStatus: string,
        newStatus: string,
        errorMessage: string | null,
        responseTime: number
    ): Promise<void> {
        try {
            // Get Slack integration for workspace
            const integration = await prisma.integration.findFirst({
                where: {
                    workspaceId,
                    type: IntegrationType.SLACK,
                    status: IntegrationStatus.ACTIVE
                },
            });

            if (!integration) {
                this.logger.debug('No active Slack integration for uptime notification');
                return;
            }

            const config = integration.configJson as { token?: string; defaultChannelId?: string };
            if (!config?.token) {
                this.logger.warn('Slack token not found in integration config');
                return;
            }

            // Decrypt token (simple base64 for now, should use proper encryption service)
            let token = config.token;
            try {
                // Check if it's encrypted (starts with 'enc:')
                if (token.startsWith('enc:')) {
                    // Would use encryption service here
                    this.logger.warn('Encrypted token found, skipping notification');
                    return;
                }
            } catch {
                // Use as-is if decryption fails
            }

            const slack = new WebClient(token);

            // Determine emoji and color based on status
            const isDown = newStatus === 'down';
            const isRecovering = previousStatus === 'down' && (newStatus === 'up' || newStatus === 'degraded');
            const isDegraded = newStatus === 'degraded';

            const emoji = isDown ? '🔴' : isRecovering ? '✅' : isDegraded ? '🟡' : '🔵';
            const color = isDown ? '#dc2626' : isRecovering ? '#16a34a' : isDegraded ? '#eab308' : '#3b82f6';
            const statusText = isDown ? 'DOWN' : isRecovering ? 'RECOVERED' : isDegraded ? 'DEGRADED' : newStatus.toUpperCase();

            const blocks = [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `${emoji} *Uptime Alert: ${checkName}*\n\nStatus changed from \`${previousStatus}\` → \`${newStatus}\``,
                    },
                },
                {
                    type: 'section',
                    fields: [
                        {
                            type: 'mrkdwn',
                            text: `*URL:*\n<${checkUrl}|${checkUrl}>`,
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Response Time:*\n${responseTime}ms`,
                        },
                    ],
                },
            ];

            if (errorMessage) {
                blocks.push({
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*Error:*\n\`\`\`${errorMessage}\`\`\``,
                    },
                } as any);
            }

            blocks.push({
                type: 'context',
                elements: [
                    {
                        type: 'mrkdwn',
                        text: `SignalCraft Uptime Monitoring • ${new Date().toLocaleString()}`,
                    },
                ],
            } as any);

            // Try to find a default channel or use the first available
            const channels = await slack.conversations.list({ limit: 10, types: 'public_channel,private_channel' });
            const targetChannel = config.defaultChannelId || channels.channels?.[0]?.id;

            if (!targetChannel) {
                this.logger.warn('No Slack channel available for uptime notification');
                return;
            }

            await slack.chat.postMessage({
                channel: targetChannel,
                text: `${emoji} Uptime Alert: ${checkName} is ${statusText}`,
                blocks,
                attachments: [
                    {
                        color,
                        fallback: `${checkName} is ${statusText}`,
                    },
                ],
            });

            this.logger.log(`Uptime notification sent to Slack for ${checkName}`);
        } catch (error: any) {
            this.logger.error(`Failed to send uptime Slack notification: ${error.message}`);
        }
    }

    // Scheduled job to run all enabled checks
    @Cron(CronExpression.EVERY_MINUTE)
    async runScheduledChecks() {
        const now = Date.now();

        // Get all enabled checks
        const checks = await prisma.uptimeCheck.findMany({
            where: { enabled: true },
            include: {
                results: {
                    take: 1,
                    orderBy: { checkedAt: 'desc' },
                },
            },
        });

        for (const check of checks) {
            const lastCheck = check.results[0]?.checkedAt;
            const intervalMs = check.interval * 1000;

            // Run check if never run or interval has passed
            if (!lastCheck || now - lastCheck.getTime() >= intervalMs) {
                this.executeCheck(check.id).catch((err) =>
                    this.logger.error(`Failed to execute check ${check.id}:`, err),
                );
            }
        }
    }
}
