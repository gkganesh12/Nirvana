import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOrClerkAuthGuard } from '../auth/api-or-clerk-auth.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { IntegrationsService } from './integrations.service';
import axios from 'axios';

class ConfigureDiscordDto {
  webhookUrl!: string;
}

@ApiTags('integrations')
@ApiBearerAuth()
@UseGuards(ApiOrClerkAuthGuard)
@Controller('api/integrations/discord')
export class DiscordController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post('test')
  @ApiOperation({ summary: 'Test Discord webhook' })
  async test(@Body() dto: ConfigureDiscordDto) {
    await axios.post(dto.webhookUrl, {
      content: 'SignalCraft Discord integration test ✅',
    });
    return { success: true };
  }

  @Post('configure')
  @ApiOperation({ summary: 'Configure Discord integration' })
  async configure(@WorkspaceId() workspaceId: string, @Body() dto: ConfigureDiscordDto) {
    await this.integrationsService.upsertIntegration(workspaceId, 'DISCORD' as any, {
      webhookUrl: dto.webhookUrl,
    });
    return { success: true };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get Discord integration status' })
  async status(@WorkspaceId() workspaceId: string) {
    const integration = await this.integrationsService.getIntegration(
      workspaceId,
      'DISCORD' as any,
    );
    return {
      configured: !!integration,
      status: integration?.status || null,
    };
  }
}
