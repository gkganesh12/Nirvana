import { Controller, Get, Post, Body, Delete, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ApiOrClerkAuthGuard } from '../auth/api-or-clerk-auth.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { SlackOAuthService } from './slack/oauth.service';
import { SlackService } from './slack/slack.service';
import { IntegrationStatus } from '@signalcraft/database';

@ApiTags('Slack Integration')
@ApiBearerAuth()
@Controller('api/integrations/slack')
@UseGuards(ApiOrClerkAuthGuard)
export class SlackController {
  private readonly logger = new Logger(SlackController.name);

  constructor(
    private readonly slackOAuth: SlackOAuthService,
    private readonly slackService: SlackService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get Slack integration status' })
  async getStatus(@WorkspaceId() workspaceId: string) {
    const integration = await this.slackOAuth.getIntegration(workspaceId);
    const isConnected = integration?.status === IntegrationStatus.ACTIVE;
    const defaultChannel = isConnected
      ? await this.slackService.getDefaultChannel(workspaceId)
      : null;

    return {
      connected: isConnected,
      defaultChannel,
    };
  }

  @Get('channels')
  @ApiOperation({ summary: 'List available Slack channels' })
  async listChannels(@WorkspaceId() workspaceId: string) {
    return this.slackService.listChannels(workspaceId);
  }

  @Delete()
  @ApiOperation({ summary: 'Disconnect Slack integration' })
  async disconnect(@WorkspaceId() workspaceId: string) {
    await this.slackOAuth.disconnect(workspaceId);
    return { success: true };
  }
}
