import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOrClerkAuthGuard } from '../auth/api-or-clerk-auth.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { StatusPagesService } from './status-pages.service';
import {
  StatusIncidentImpact,
  StatusIncidentStatus,
  StatusPageVisibility,
} from '@signalcraft/database';

@ApiTags('Status Pages')
@Controller('api/status-pages')
export class StatusPagesController {
  constructor(private readonly statusPagesService: StatusPagesService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(ApiOrClerkAuthGuard)
  @ApiOperation({ summary: 'List status pages' })
  async list(@WorkspaceId() workspaceId: string) {
    return this.statusPagesService.listStatusPages(workspaceId);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(ApiOrClerkAuthGuard)
  @ApiOperation({ summary: 'Create status page' })
  async create(
    @WorkspaceId() workspaceId: string,
    @Body() body: { slug: string; title: string; description?: string; visibility?: string },
  ) {
    return this.statusPagesService.createStatusPage(workspaceId, {
      slug: body.slug,
      title: body.title,
      description: body.description,
      visibility: this.parseVisibility(body.visibility),
    });
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(ApiOrClerkAuthGuard)
  @ApiOperation({ summary: 'Update status page' })
  async update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string; visibility?: string; isActive?: boolean },
  ) {
    return this.statusPagesService.updateStatusPage(workspaceId, id, {
      title: body.title,
      description: body.description,
      visibility: body.visibility ? this.parseVisibility(body.visibility) : undefined,
      isActive: body.isActive,
    });
  }

  @Get(':id/incidents')
  @ApiBearerAuth()
  @UseGuards(ApiOrClerkAuthGuard)
  @ApiOperation({ summary: 'List status incidents' })
  async listIncidents(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.statusPagesService.listIncidents(workspaceId, id);
  }

  @Post(':id/incidents')
  @ApiBearerAuth()
  @UseGuards(ApiOrClerkAuthGuard)
  @ApiOperation({ summary: 'Create status incident' })
  async createIncident(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body()
    body: {
      title: string;
      status: string;
      impact?: string;
      message?: string;
      alertGroupId?: string;
    },
  ) {
    return this.statusPagesService.createIncident(workspaceId, id, {
      title: body.title,
      status: this.parseStatus(body.status),
      impact: body.impact ? this.parseImpact(body.impact) : undefined,
      message: body.message,
      alertGroupId: body.alertGroupId,
    });
  }

  @Patch(':id/incidents/:incidentId')
  @ApiBearerAuth()
  @UseGuards(ApiOrClerkAuthGuard)
  @ApiOperation({ summary: 'Update status incident' })
  async updateIncident(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Param('incidentId') incidentId: string,
    @Body() body: { status?: string; impact?: string; message?: string },
  ) {
    return this.statusPagesService.updateIncident(workspaceId, id, incidentId, {
      status: body.status ? this.parseStatus(body.status) : undefined,
      impact: body.impact ? this.parseImpact(body.impact) : undefined,
      message: body.message,
    });
  }

  @Get('public/:slug')
  @ApiOperation({ summary: 'Get public status page' })
  async getPublic(@Param('slug') slug: string) {
    return this.statusPagesService.getPublicStatusPage(slug);
  }

  @Post('public/:slug/subscribe')
  @ApiOperation({ summary: 'Subscribe to status page' })
  async subscribe(@Param('slug') slug: string, @Body() body: { email?: string }) {
    if (!body.email) {
      throw new BadRequestException('Email is required');
    }
    const page = await this.statusPagesService.getPublicStatusPage(slug);
    if (!page) {
      throw new BadRequestException('Status page not found');
    }
    return this.statusPagesService.subscribe(page.id, body.email);
  }

  @Get('public/:slug/verify')
  @ApiOperation({ summary: 'Verify status page subscriber' })
  async verify(
    @Param('slug') slug: string,
    @Query('token') token: string,
    @Query('email') email: string,
  ) {
    if (!token || !email) {
      throw new BadRequestException('Token and email are required');
    }
    return this.statusPagesService.verifySubscriber(slug, token, email);
  }

  @Post('public/:slug/unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe from status page' })
  async unsubscribe(@Param('slug') slug: string, @Body() body: { email?: string }) {
    if (!body.email) {
      throw new BadRequestException('Email is required');
    }
    return this.statusPagesService.unsubscribe(slug, body.email);
  }

  private parseVisibility(value?: string): StatusPageVisibility {
    if (!value) return StatusPageVisibility.PUBLIC;
    const normalized = value.toUpperCase();
    if (!(normalized in StatusPageVisibility)) {
      throw new BadRequestException(`Invalid visibility: ${value}`);
    }
    return StatusPageVisibility[normalized as keyof typeof StatusPageVisibility];
  }

  private parseStatus(value: string): StatusIncidentStatus {
    const normalized = value.toUpperCase();
    if (!(normalized in StatusIncidentStatus)) {
      throw new BadRequestException(`Invalid status: ${value}`);
    }
    return StatusIncidentStatus[normalized as keyof typeof StatusIncidentStatus];
  }

  private parseImpact(value: string): StatusIncidentImpact {
    const normalized = value.toUpperCase();
    if (!(normalized in StatusIncidentImpact)) {
      throw new BadRequestException(`Invalid impact: ${value}`);
    }
    return StatusIncidentImpact[normalized as keyof typeof StatusIncidentImpact];
  }
}
