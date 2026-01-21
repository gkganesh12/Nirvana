import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { InternalServerException } from '../common/exceptions/base.exception';

interface WebhookHeader {
    [key: string]: string;
}

@Injectable()
export class WebhookDispatcherService {
    private readonly logger = new Logger(WebhookDispatcherService.name);

    /**
     * Dispatch a webhook with retry logic
     */
    async dispatch(url: string, payload: Record<string, unknown>, headers: WebhookHeader = {}): Promise<void> {
        const maxRetries = 3;
        let lastError: unknown;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await axios.post(url, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'SignalCraft-Webhook/1.0',
                        ...headers,
                    },
                    timeout: 10000, // 10 second timeout
                });

                this.logger.debug(`Webhook dispatched successfully to ${url} (${response.status})`);
                return;
            } catch (error: unknown) {
                lastError = error;
                const err = error as any; // Using any for axios error properties
                this.logger.warn(`Webhook attempt ${attempt} failed for ${url}: ${err.message}`);

                if (attempt < maxRetries) {
                    // Wait before retry (exponential backoff)
                    const delay = Math.pow(2, attempt) * 1000;
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
            }
        }

        this.logger.error(`Webhook failed after ${maxRetries} attempts to ${url}`);
        throw new InternalServerException('Webhook dispatch failed', { url, error: lastError });
    }
}
