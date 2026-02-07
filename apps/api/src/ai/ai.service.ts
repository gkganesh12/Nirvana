import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ResolutionSuggestion {
    suggestion: string;
    confidence: 'high' | 'medium' | 'low';
    basedOnCount: number;
    sources: Array<{ title: string; notes: string; resolvedBy: string | null }>;
}

export interface ResolutionSuggestionContext {
    recentLogs?: string;
    deploymentContext?: string;
    changeEvents?: string;
    crossProjectNote?: string;
}

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private readonly apiKey: string | undefined;
    private readonly model: string;
    private readonly apiUrl = 'https://openrouter.ai/api/v1/chat/completions';

    constructor(private readonly configService: ConfigService) {
        this.apiKey = this.configService.get<string>('OPENROUTER_API_KEY');
        this.model = this.configService.get<string>('OPENROUTER_MODEL') || 'openai/gpt-oss-120b';
        if (!this.apiKey) {
            this.logger.warn('OPENROUTER_API_KEY not configured - AI suggestions disabled');
        } else {
            this.logger.log('AI service initialized with OpenRouter');
        }
    }

    /**
     * Generate a resolution suggestion based on similar past resolutions
     */
    async generateResolutionSuggestion(
        currentAlert: { title: string; description: string; environment: string; project: string },
        pastResolutions: Array<{
            title: string;
            resolutionNotes: string | null;
            lastResolvedBy: string | null;
            project?: string | null;
            environment?: string | null;
        }>,
        context: ResolutionSuggestionContext = {},
    ): Promise<ResolutionSuggestion | null> {
        // Filter to only resolutions that have notes
        const validResolutions = pastResolutions.filter(r => r.resolutionNotes);

        if (!this.apiKey || validResolutions.length === 0) {
            return null;
        }

        try {
            const prompt = this.buildPrompt(currentAlert, validResolutions, context);
            const response = await this.callLLM(prompt);

            if (!response) {
                return null;
            }

            return {
                suggestion: response,
                confidence: this.calculateConfidence(validResolutions.length),
                basedOnCount: validResolutions.length,
                sources: validResolutions.map(r => ({
                    title: r.title,
                    notes: r.resolutionNotes || '',
                    resolvedBy: r.lastResolvedBy,
                })),
            };
        } catch (error) {
            this.logger.error('Failed to generate AI suggestion', error);
            return null;
        }
    }

    private buildPrompt(
        currentAlert: { title: string; description: string; environment: string; project: string },
        pastResolutions: Array<{
            title: string;
            resolutionNotes: string | null;
            project?: string | null;
            environment?: string | null;
        }>,
        context: ResolutionSuggestionContext,
    ): string {
        const resolutionExamples = pastResolutions
            .map((r, i) => {
                const projectLabel = r.project ? ` [${r.project}${r.environment ? `/${r.environment}` : ''}]` : '';
                const note = this.truncateText(r.resolutionNotes || '', 280);
                return `${i + 1}. "${note}"${projectLabel}`;
            })
            .join('\n');

        const contextSections = [
            context.recentLogs ? `RECENT LOG CONTEXT:\n${context.recentLogs}` : null,
            context.deploymentContext ? `DEPLOYMENT CONTEXT:\n${context.deploymentContext}` : null,
            context.changeEvents ? `CHANGE EVENTS NEAR INCIDENT:\n${context.changeEvents}` : null,
            context.crossProjectNote ? `CROSS-PROJECT CONTEXT:\n${context.crossProjectNote}` : null,
        ].filter(Boolean).join('\n\n');

        return `You are an experienced SRE helping an on-call engineer quickly fix an alert.

CURRENT ALERT:
- Title: ${currentAlert.title}
- Description: ${currentAlert.description}
- Environment: ${currentAlert.environment}
- Project: ${currentAlert.project}

${contextSections ? `${contextSections}\n\n` : ''}PAST RESOLUTIONS FOR SIMILAR ALERTS:
${resolutionExamples}

Based on these past resolutions, provide a BRIEF, ACTIONABLE suggestion for how to fix this alert.
- Be concise (1-2 sentences max)
- Focus on the most likely fix
- Include specific commands or steps if mentioned in past resolutions
- If past resolutions vary, mention the most common approach
- If some resolutions are from other projects, adapt them to the current project/environment

SUGGESTION:`;
    }

    private async callLLM(prompt: string): Promise<string | null> {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'HTTP-Referer': 'https://signalcraft.dev',
                    'X-Title': 'SignalCraft AI',
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 220,
                    temperature: 0.3,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`OpenRouter API error: ${response.status} - ${errorText}`);
                return null;
            }

            interface OpenRouterResponse {
                choices?: Array<{ message?: { content?: string } }>;
            }
            const data = await response.json() as OpenRouterResponse;
            const text = data?.choices?.[0]?.message?.content;
            return text?.trim() || null;
        } catch (error) {
            this.logger.error('OpenRouter API call failed', error);
            return null;
        }
    }

    private calculateConfidence(resolutionCount: number): 'high' | 'medium' | 'low' {
        if (resolutionCount >= 3) return 'high';
        if (resolutionCount >= 2) return 'medium';
        return 'low';
    }

    private truncateText(value: string, maxLength: number): string {
        if (!value) return '';
        if (value.length <= maxLength) return value;
        const clipped = value.slice(0, Math.max(0, maxLength - 3));
        return `${clipped}...`;
    }

    /**
     * Check if AI suggestions are enabled
     */
    isEnabled(): boolean {
        return !!this.apiKey;
    }

    /**
     * Generic method to generate content via LLM
     */
    async generateContent(prompt: string): Promise<string> {
        if (!this.apiKey) return 'AI not configured.';
        const result = await this.callLLM(prompt);
        return result || 'Failed to generate content.';
    }
}
