import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class HttpActionExecutor {
    private readonly logger = new Logger(HttpActionExecutor.name);

    async execute(config: any, alert: any): Promise<{ success: boolean; output?: any }> {
        try {
            const url = this.interpolate(config.url, alert);
            const method = config.method || 'POST';
            const headers = config.headers || {};
            const body = config.body ? this.interpolate(config.body, alert) : undefined;

            this.logger.log(`Executing HTTP ${method} request to ${url}`);

            const response = await axios({
                method,
                url,
                headers,
                data: body,
                timeout: config.timeout || 30000,
            });

            return {
                success: response.status >= 200 && response.status < 300,
                output: {
                    status: response.status,
                    data: response.data,
                },
            };
        } catch (error: any) {
            this.logger.error(`HTTP request failed: ${error.message}`);
            throw new Error(`HTTP request failed: ${error.message}`);
        }
    }

    private interpolate(template: any, alert: any): any {
        if (typeof template === 'string') {
            return template
                .replace(/\{\{alert\.id\}\}/g, alert.id)
                .replace(/\{\{alert\.title\}\}/g, alert.title)
                .replace(/\{\{alert\.severity\}\}/g, alert.severity)
                .replace(/\{\{alert\.environment\}\}/g, alert.environment)
                .replace(/\{\{alert\.project\}\}/g, alert.project)
                .replace(/\{\{alert\.status\}\}/g, alert.status);
        }

        if (typeof template === 'object' && template !== null) {
            const result: any = Array.isArray(template) ? [] : {};
            for (const key in template) {
                result[key] = this.interpolate(template[key], alert);
            }
            return result;
        }

        return template;
    }
}
