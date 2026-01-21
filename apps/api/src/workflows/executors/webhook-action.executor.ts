import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class WebhookActionExecutor {
    private readonly logger = new Logger(WebhookActionExecutor.name);

    async execute(config: any, alert: any): Promise<{ success: boolean; output?: any }> {
        try {
            const url = config.url;
            const payload = {
                event: 'workflow.action',
                alert: {
                    id: alert.id,
                    title: alert.title,
                    severity: alert.severity,
                    environment: alert.environment,
                    project: alert.project,
                    status: alert.status,
                },
                timestamp: new Date().toISOString(),
                ...config.customPayload,
            };

            this.logger.log(`Sending webhook to ${url}`);

            const response = await axios.post(url, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'SignalCraft-Workflow/1.0',
                    ...config.headers,
                },
                timeout: config.timeout || 10000,
            });

            return {
                success: response.status >= 200 && response.status < 300,
                output: {
                    status: response.status,
                    data: response.data,
                },
            };
        } catch (error: any) {
            this.logger.error(`Webhook request failed: ${error.message}`);
            throw new Error(`Webhook request failed: ${error.message}`);
        }
    }
}
