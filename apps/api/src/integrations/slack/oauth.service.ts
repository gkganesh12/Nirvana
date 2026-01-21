import { Injectable, Logger } from '@nestjs/common';
import { prisma, IntegrationStatus, IntegrationType } from '@signalcraft/database';
import { EncryptionService } from '../../common/encryption/encryption.service';
import { SecretsService } from '../../common/secrets/secrets.service';

interface SlackOAuthResponse {
  ok: boolean;
  access_token?: string;
  team?: { id: string; name: string };
  authed_user?: { id?: string };
  bot_user_id?: string;
  error?: string;
}

@Injectable()
export class SlackOAuthService {
  private readonly logger = new Logger(SlackOAuthService.name);

  constructor(
    private readonly encryption: EncryptionService,
    private readonly secretsService: SecretsService,
  ) { }

  async exchangeCode(code: string) {
    let clientId: string | undefined;
    let clientSecret: string | undefined;
    let redirectUri: string | undefined;

    try {
      // ✅ SECURE: Get from Secrets Manager
      clientId = await this.secretsService.getSecret('signalcraft/global/slack-client-id');
      clientSecret = await this.secretsService.getSecret('signalcraft/global/slack-client-secret');
      redirectUri = process.env.SLACK_REDIRECT_URI; // Keeping this in env as it's not a secret
    } catch (error) {
      // Fallback to Env
      clientId = process.env.SLACK_CLIENT_ID;
      clientSecret = process.env.SLACK_CLIENT_SECRET;
      redirectUri = process.env.SLACK_REDIRECT_URI;

      this.logger.warn('Slack OAuth secrets not found in Secrets Manager, using fallback');
    }

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Slack OAuth configuration missing');
    }

    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = (await response.json()) as SlackOAuthResponse;
    if (!data.ok || !data.access_token) {
      throw new Error(data.error ?? 'Slack OAuth failed');
    }

    return data;
  }

  async upsertIntegration(workspaceId: string, oauth: SlackOAuthResponse) {
    const encryptedToken = this.encryption.encrypt(oauth.access_token ?? '');

    return prisma.integration.upsert({
      where: {
        workspaceId_type: {
          workspaceId,
          type: IntegrationType.SLACK,
        },
      },
      create: {
        workspaceId,
        type: IntegrationType.SLACK,
        status: IntegrationStatus.ACTIVE,
        configJson: {
          token: encryptedToken,
          teamId: oauth.team?.id,
          teamName: oauth.team?.name,
          botUserId: oauth.bot_user_id,
        },
      },
      update: {
        status: IntegrationStatus.ACTIVE,
        configJson: {
          token: encryptedToken,
          teamId: oauth.team?.id,
          teamName: oauth.team?.name,
          botUserId: oauth.bot_user_id,
        },
      },
    });
  }

  async getIntegration(workspaceId: string) {
    return prisma.integration.findFirst({
      where: { workspaceId, type: IntegrationType.SLACK },
    });
  }

  async disconnect(workspaceId: string) {
    return prisma.integration.updateMany({
      where: { workspaceId, type: IntegrationType.SLACK },
      data: { status: IntegrationStatus.DISABLED },
    });
  }

  async getDecryptedToken(workspaceId: string) {
    const integration = await this.getIntegration(workspaceId);
    if (!integration || integration.status !== IntegrationStatus.ACTIVE) {
      return null;
    }
    const token = (integration.configJson as { token?: string })?.token;
    if (!token) {
      return null;
    }
    return this.encryption.decrypt(token);
  }
}
