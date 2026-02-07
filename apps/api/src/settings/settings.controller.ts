import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { ApiOrClerkAuthGuard } from '../auth/api-or-clerk-auth.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { SettingsService, NotificationPreferences } from './settings.service';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(ApiOrClerkAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('workspace')
  @ApiOperation({ summary: 'Get workspace settings' })
  async getWorkspace(@WorkspaceId() workspaceId: string) {
    const workspace = await this.settingsService.getWorkspaceSettings(workspaceId);
    if (!workspace) throw new NotFoundException('Workspace not found');
    return workspace;
  }

  @Put('workspace')
  @ApiOperation({ summary: 'Update workspace settings' })
  async updateWorkspace(@WorkspaceId() workspaceId: string, @Body() data: { name: string }) {
    return this.settingsService.updateWorkspaceSettings(workspaceId, data);
  }

  @Get('users')
  @ApiOperation({ summary: 'List workspace users' })
  async listUsers(@WorkspaceId() workspaceId: string) {
    return this.settingsService.getUsers(workspaceId);
  }

  @Post('users/invite')
  @ApiOperation({ summary: 'Invite a user to the workspace' })
  async inviteUser(@WorkspaceId() workspaceId: string, @Body() data: { email: string }) {
    return this.settingsService.inviteUser(workspaceId, data.email);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Get notification preferences' })
  getNotificationPreferences(@WorkspaceId() workspaceId: string) {
    return this.settingsService.getNotificationPreferences(workspaceId);
  }

  @Put('notifications')
  @ApiOperation({ summary: 'Update notification preferences' })
  updateNotificationPreferences(
    @WorkspaceId() workspaceId: string,
    @Body() preferences: NotificationPreferences,
  ) {
    return this.settingsService.updateNotificationPreferences(workspaceId, preferences);
  }

  @Get('twilio')
  @ApiOperation({ summary: 'Get Twilio settings' })
  async getTwilioSettings(@WorkspaceId() workspaceId: string) {
    return this.settingsService.getTwilioSettings(workspaceId);
  }

  @Put('twilio')
  @ApiOperation({ summary: 'Update Twilio settings' })
  async updateTwilioSettings(
    @WorkspaceId() workspaceId: string,
    @Body() data: { accountSid: string; authToken: string; fromNumber: string },
  ) {
    return this.settingsService.setTwilioSettings(workspaceId, data);
  }

  @Post('twilio/test')
  @ApiOperation({ summary: 'Test Twilio settings' })
  async testTwilioSettings(
    @WorkspaceId() workspaceId: string,
    @Body() data: { to: string; channel: 'SMS' | 'VOICE' },
  ) {
    return this.settingsService.testTwilioSettings(workspaceId, data);
  }
}
