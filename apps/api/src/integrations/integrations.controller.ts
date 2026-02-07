import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiOrClerkAuthGuard } from '../auth/api-or-clerk-auth.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { SlackOAuthService } from './slack/oauth.service';
import { SlackService } from './slack/slack.service';
import { PermissionsGuard, RequirePermission, RESOURCES } from '../permissions/permissions.guard';

@ApiTags('integrations')
@ApiBearerAuth()
@UseGuards(ApiOrClerkAuthGuard, PermissionsGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly slackOAuth: SlackOAuthService,
    private readonly slackService: SlackService,
  ) { }

  @Get('slack/status')
  @RequirePermission(RESOURCES.INTEGRATIONS, 'READ')
  async slackStatus(@WorkspaceId() workspaceId: string) {
    const integration = await this.slackOAuth.getIntegration(workspaceId);
    if (!integration) {
      return { connected: false };
    }
    const config = integration.configJson as Record<string, unknown>;
    return {
      connected: integration.status === 'ACTIVE',
      teamName: config.teamName ?? null,
      defaultChannel: config.defaultChannel ?? null,
    };
  }

  @Post('slack/install')
  @RequirePermission(RESOURCES.INTEGRATIONS, 'WRITE')
  async slackInstall(@WorkspaceId() workspaceId: string, @Body() payload: { code: string }) {
    if (!payload.code) {
      throw new BadRequestException('Missing Slack code');
    }
    const oauth = await this.slackOAuth.exchangeCode(payload.code);
    await this.slackOAuth.upsertIntegration(workspaceId, oauth);
    return { status: 'ok' };
  }

  @Post('slack/disconnect')
  @RequirePermission(RESOURCES.INTEGRATIONS, 'WRITE')
  async slackDisconnect(@WorkspaceId() workspaceId: string) {
    await this.slackOAuth.disconnect(workspaceId);
    return { status: 'ok' };
  }

  @Get('slack/channels')
  async slackChannels(@WorkspaceId() workspaceId: string) {
    return this.slackService.listChannels(workspaceId);
  }

  @Post('slack/default-channel')
  async setDefaultChannel(
    @WorkspaceId() workspaceId: string,
    @Body() payload: { channelId: string },
  ) {
    if (!payload.channelId) {
      throw new BadRequestException('Missing channelId');
    }
    await this.slackService.updateDefaultChannel(workspaceId, payload.channelId);
    await this.slackService.updateDefaultChannel(workspaceId, payload.channelId);
    return { status: 'ok' };
  }

  @Post('slack/test')
  async slackTest(@WorkspaceId() workspaceId: string) {
    try {
      await this.slackService.sendTestMessage(workspaceId);
      return { status: 'ok', message: 'Test message sent' };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      throw new BadRequestException(`Test failed: ${msg}`);
    }
  }
}
