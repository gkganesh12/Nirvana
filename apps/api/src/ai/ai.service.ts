import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ResolutionSuggestion {
    suggestion: string;
    confidence: 'high' | 'medium' | 'low';
    basedOnCount: number;
    sources: Array<{ title: string; notes: string; resolvedBy: string | null }>;
}

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private readonly apiKey: string | undefined;
    private readonly apiUrl = 'https://openrouter.ai/api/v1/chat/completions';

    constructor(private readonly configService: ConfigService) {
        this.apiKey = this.configService.get<string>('OPENROUTER_API_KEY');
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
        pastResolutions: Array<{ title: string; resolutionNotes: string | null; lastResolvedBy: string | null }>
    ): Promise<ResolutionSuggestion | null> {
        // Filter to only resolutions that have notes
        const validResolutions = pastResolutions.filter(r => r.resolutionNotes);

        if (!this.apiKey || validResolutions.length === 0) {
            return null;
        }

        try {
            const prompt = this.buildPrompt(currentAlert, validResolutions);
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
        pastResolutions: Array<{ title: string; resolutionNotes: string | null }>
    ): string {
        const resolutionExamples = pastResolutions
            .map((r, i) => `${i + 1}. "${r.resolutionNotes}"`)
            .join('\n');

        return `You are an experienced SRE helping an on-call engineer quickly fix an alert.

CURRENT ALERT:
- Title: ${currentAlert.title}
- Description: ${currentAlert.description}
- Environment: ${currentAlert.environment}
- Project: ${currentAlert.project}

PAST RESOLUTIONS FOR SIMILAR ALERTS:
${resolutionExamples}

Based on these past resolutions, provide a BRIEF, ACTIONABLE suggestion for how to fix this alert.
- Be concise (1-2 sentences max)
- Focus on the most likely fix
- Include specific commands or steps if mentioned in past resolutions
- If past resolutions vary, mention the most common approach

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
                    model: 'google/gemini-flash-1.5',
                    messages: [
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 150,
                    temperature: 0.3,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`OpenRouter API error: ${response.status} - ${errorText}`);
                return null;
            }

            const data = await response.json() as any;
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
