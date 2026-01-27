import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOrClerkAuthGuard } from '../auth/api-or-clerk-auth.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { IntegrationsService } from './integrations.service';
import axios from 'axios';

class ConfigureTeamsDto {
  webhookUrl!: string;
}

@ApiTags('integrations')
@ApiBearerAuth()
@UseGuards(ApiOrClerkAuthGuard)
@Controller('api/integrations/teams')
export class TeamsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post('test')
  @ApiOperation({ summary: 'Test Microsoft Teams webhook' })
  async test(@Body() dto: ConfigureTeamsDto) {
    await axios.post(dto.webhookUrl, {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: 'SignalCraft Teams webhook test',
      themeColor: '0078D4',
      title: 'SignalCraft Teams Integration',
      text: 'Your Teams webhook is configured correctly.',
    });
    return { success: true };
  }

  @Post('configure')
  @ApiOperation({ summary: 'Configure Microsoft Teams integration' })
  async configure(@WorkspaceId() workspaceId: string, @Body() dto: ConfigureTeamsDto) {
    await this.integrationsService.upsertIntegration(workspaceId, 'TEAMS' as any, {
      webhookUrl: dto.webhookUrl,
    });
    return { success: true };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get Microsoft Teams integration status' })
  async status(@WorkspaceId() workspaceId: string) {
    const integration = await this.integrationsService.getIntegration(workspaceId, 'TEAMS' as any);
    return {
      configured: !!integration,
      status: integration?.status || null,
    };
  }
}
