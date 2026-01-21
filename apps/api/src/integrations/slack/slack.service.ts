import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebClient } from '@slack/web-api';
import { SecretsService } from '../../common/secrets/secrets.service';
import { prisma } from '@signalcraft/database';
import { SlackOAuthService } from './oauth.service';

interface SlackConfig {
  accessToken: string;
  botToken: string;
  signingSecret: string;
  teamId?: string;
}

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);
  private readonly clients = new Map<string, WebClient>();

  constructor(
    private readonly configService: ConfigService,
    private readonly secretsService: SecretsService,
    private readonly slackOAuth: SlackOAuthService,
  ) { }

  /**
   * Get or create Slack client for workspace
   */
  async getClient(workspaceId: string): Promise<WebClient> {
    // Check cache
    if (this.clients.has(workspaceId)) {
      return this.clients.get(workspaceId)!;
    }

    // ✅ RETRIEVE SLACK CREDENTIALS FROM SECRETS MANAGER
    const config = await this.getSlackConfig(workspaceId);

    const client = new WebClient(config.botToken);
    this.clients.set(workspaceId, client);

    return client;
  }

  /**
   * Get Slack configuration from AWS Secrets Manager
   */
  async getSlackConfig(workspaceId: string): Promise<SlackConfig> {
    try {
      // ✅ SECURE: Get from Secrets Manager instead of .env
      const config = await this.secretsService.getSecretJson<SlackConfig>(
        `signalcraft/${workspaceId}/slack`
      );

      this.logger.log(`Retrieved Slack config for workspace ${workspaceId}`);
      return config;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to retrieve Slack config for workspace ${workspaceId}: ${message}`);
      throw new NotFoundException(`Slack configuration not found for workspace ${workspaceId}`);
    }
  }

  async listChannels(workspaceId: string) {
    const client = await this.getClient(workspaceId);
    const response = await client.conversations.list({
      types: 'public_channel,private_channel',
      limit: 200,
    });

    return (
      response.channels?.map((channel) => ({
        id: channel.id,
        name: channel.name,
      })) ?? []
    );
  }

  async getDefaultChannel(workspaceId: string): Promise<string | null> {
    const configured = process.env.SLACK_DEFAULT_CHANNEL;
    if (configured) {
      return configured;
    }
    const integration = await this.slackOAuth.getIntegration(workspaceId);
    const stored = (integration?.configJson as { defaultChannel?: string })?.defaultChannel;
    return stored ?? null;
  }

  async updateDefaultChannel(workspaceId: string, channelId: string) {
    const integration = await this.slackOAuth.getIntegration(workspaceId);
    if (!integration) {
      return null;
    }
    return prisma.integration.update({
      where: { id: integration.id },
      data: {
        configJson: {
          ...(integration.configJson as Record<string, unknown>),
          defaultChannel: channelId,
        },
      },
    });
  }

  async sendTestMessage(workspaceId: string) {
    const token = await this.slackOAuth.getDecryptedToken(workspaceId);
    if (!token) throw new Error('Slack not connected');

    const channel = await this.getDefaultChannel(workspaceId);
    if (!channel) throw new Error('Default channel not configured');

    const client = new WebClient(token);
    await client.chat.postMessage({
      channel,
      text: '🔔 *SignalCraft Test Alert*\nThis is a test notification to verify your Slack integration.',
    });

    return true;
  }
}
