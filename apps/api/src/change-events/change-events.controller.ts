import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiOrClerkAuthGuard } from '../auth/api-or-clerk-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { ChangeEventsService, CreateChangeEventDto } from './change-events.service';

@ApiTags('Change Events')
@ApiBearerAuth()
@UseGuards(ApiOrClerkAuthGuard, RolesGuard)
@Controller('api/change-events')
export class ChangeEventsController {
  constructor(private readonly changeEventsService: ChangeEventsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a change event' })
  @ApiResponse({ status: 201, description: 'Change event created' })
  async createChangeEvent(@WorkspaceId() workspaceId: string, @Body() body: CreateChangeEventDto) {
    return this.changeEventsService.createChangeEvent(workspaceId, body);
  }

  @Get()
  @ApiOperation({ summary: 'List change events' })
  @ApiQuery({ name: 'project', required: false })
  @ApiQuery({ name: 'environment', required: false })
  @ApiQuery({ name: 'since', required: false })
  @ApiQuery({ name: 'until', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'List of change events' })
  async listChangeEvents(
    @WorkspaceId() workspaceId: string,
    @Query('project') project?: string,
    @Query('environment') environment?: string,
    @Query('since') since?: string,
    @Query('until') until?: string,
    @Query('limit') limit?: string,
  ) {
    return this.changeEventsService.listChangeEvents(workspaceId, {
      project,
      environment,
      since: since ? new Date(since) : undefined,
      until: until ? new Date(until) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }
}
