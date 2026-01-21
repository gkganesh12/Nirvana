import { BadRequestException, Controller, Get, Param, Query, UseGuards, NotFoundException, Post, Patch, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AlertsService, AlertGroupFilters, PaginationOptions, SortOptions } from './alerts.service';
import { CorrelationService } from './correlation.service';
import { PostmortemService } from './postmortem.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { DbUser } from '../common/decorators/db-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AlertStatus, AlertSeverity, User } from '@signalcraft/database';

@ApiTags('Alerts')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard, RolesGuard)
@Controller('api/alert-groups')
export class AlertsController {
  constructor(
    private readonly alertsService: AlertsService,
    private readonly correlationService: CorrelationService,
    private readonly postmortemService: PostmortemService,
  ) { }

  // ... existing code ...

  @Post(':id/postmortem')
  @ApiOperation({ summary: 'Generate postmortem report', description: 'Automatically generates a postmortem report for an alert group using AI analysis.' })
  @ApiResponse({ status: 201, description: 'Postmortem generated successfully' })
  @ApiResponse({ status: 404, description: 'Alert group not found' })
  async generatePostmortem(
    @WorkspaceId() workspaceId: string,
    @Param('id') groupId: string,
  ) {
    const report = await this.postmortemService.generatePostmortem(workspaceId, groupId);
    return { report };
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Get related alerts', description: 'Retrieves alerts correlated with the specified group.' })
  @ApiResponse({ status: 200, description: 'List of related alerts' })
  async getRelatedAlerts(
    @WorkspaceId() workspaceId: string,
    @Param('id') groupId: string,
  ) {
    return this.correlationService.getCorrelatedAlerts(workspaceId, groupId);
  }

  @Post('analyze-correlations')
  @ApiOperation({ summary: 'Trigger correlation analysis', description: 'Manually triggers the correlation engine to analyze alerts in the workspace.' })
  @ApiResponse({ status: 202, description: 'Analysis queued' })
  async triggerCorrelationAnalysis(@WorkspaceId() workspaceId: string) {
    this.correlationService.analyzeCorrelations(workspaceId);
    return { message: 'Correlation analysis queued' };
  }

  @Get('anomalies')
  @ApiOperation({ summary: 'Get anomaly alerts', description: 'Retrieves alerts identified as anomalies by the ML/heuristic engine.' })
  async getAnomalies(@WorkspaceId() workspaceId: string) {
    return this.alertsService.getAnomalies(workspaceId);
  }

  @Get()
  @ApiOperation({ summary: 'List alert groups', description: 'Retrieves a paginated list of alert groups with support for filtering and searching.' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status (comma-separated)', example: 'OPEN,ACKNOWLEDGED' })
  @ApiQuery({ name: 'severity', required: false, type: String, description: 'Filter by severity (comma-separated)', example: 'HIGH,CRITICAL' })
  @ApiQuery({ name: 'environment', required: false, type: String, description: 'Filter by environment (comma-separated)', example: 'production' })
  @ApiQuery({ name: 'project', required: false, type: String, description: 'Filter by project (comma-separated)', example: 'api-service' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Free-text search across titles and messages' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'sortBy', required: false, type: String, example: 'lastSeenAt' })
  @ApiQuery({ name: 'sortOrder', required: false, type: String, enum: ['asc', 'desc'], example: 'desc' })
  @ApiResponse({ status: 200, description: 'Paginated list of alert groups' })
  async listAlertGroups(
    @WorkspaceId() workspaceId: string,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('environment') environment?: string,
    @Query('project') project?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const filters: AlertGroupFilters = {};

    if (status) {
      filters.status = status.split(',').map((s) => s.toUpperCase()) as AlertStatus[];
    }
    if (severity) {
      filters.severity = severity.split(',').map((s) => s.toUpperCase()) as AlertSeverity[];
    }
    if (environment) {
      filters.environment = environment.split(',');
    }
    if (project) {
      filters.project = project.split(',');
    }
    if (search) {
      filters.search = search;
    }

    const pagination: PaginationOptions = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? Math.min(parseInt(limit, 10), 100) : 20,
    };

    const sort: SortOptions = {
      sortBy: (sortBy as SortOptions['sortBy']) || 'lastSeenAt',
      sortOrder: (sortOrder as SortOptions['sortOrder']) || 'desc',
    };

    return this.alertsService.listAlertGroups(workspaceId, filters, pagination, sort);
  }

  @Get('filter-options')
  @ApiOperation({ summary: 'Get filter metadata', description: 'Returns dynamic filter options (environments, projects) available for the workspace.' })
  async getFilterOptions(@WorkspaceId() workspaceId: string) {
    return this.alertsService.getFilterOptions(workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get alert group detail', description: 'Retrieves detailed information, including stats and status history, for a specific alert group.' })
  @ApiResponse({ status: 200, description: 'Alert group details' })
  @ApiResponse({ status: 404, description: 'Alert group not found' })
  async getAlertGroupDetail(
    @WorkspaceId() workspaceId: string,
    @Param('id') groupId: string,
  ) {
    const group = await this.alertsService.getAlertGroupDetail(workspaceId, groupId);
    if (!group) {
      throw new NotFoundException('Alert group not found');
    }
    return group;
  }

  @Get(':id/events')
  @ApiOperation({ summary: 'List alert events', description: 'Retrieves all individual alert events associated with a group.' })
  async listEvents(
    @WorkspaceId() workspaceId: string,
    @Param('id') groupId: string,
  ) {
    return this.alertsService.listEvents(workspaceId, groupId);
  }

  @Get(':id/breadcrumbs')
  @ApiOperation({ summary: 'Get error breadcrumbs', description: 'Retrieves the timeline of actions leading up to the error (if available in payload).' })
  async getBreadcrumbs(
    @WorkspaceId() workspaceId: string,
    @Param('id') groupId: string,
  ) {
    return this.alertsService.getBreadcrumbs(workspaceId, groupId);
  }

  @Get(':id/ai-suggestion')
  @ApiOperation({ summary: 'Get AI investigation suggestion', description: 'Provides an automated explanation and investigation path for the error group.' })
  async getAiSuggestion(
    @WorkspaceId() workspaceId: string,
    @Param('id') groupId: string,
  ) {
    const result = await this.alertsService.getAiSuggestion(workspaceId, groupId);
    if (!result) {
      throw new NotFoundException('Alert group not found');
    }
    return result;
  }

  @Post(':id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge alert group', description: 'Marks the alert group as acknowledged by the current user.' })
  @ApiResponse({ status: 200, description: 'Alert group acknowledged' })
  async acknowledgeAlert(
    @WorkspaceId() workspaceId: string,
    @DbUser() user: User,
    @Param('id') groupId: string,
  ) {
    const result = await this.alertsService.acknowledgeAlert(workspaceId, groupId, user.id);
    if (!result) {
      throw new NotFoundException('Alert group not found');
    }
    return result;
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Resolve alert group', description: 'Marks the alert group as resolved with optional resolution notes.' })
  @ApiResponse({ status: 200, description: 'Alert group resolved' })
  async resolveAlert(
    @WorkspaceId() workspaceId: string,
    @DbUser() user: User,
    @Param('id') groupId: string,
    @Body() body: { resolutionNotes?: string },
  ) {
    const result = await this.alertsService.resolveAlert(
      workspaceId,
      groupId,
      body.resolutionNotes,
      user.id,
    );
    if (!result) {
      throw new NotFoundException('Alert group not found');
    }
    return result;
  }

  @Post(':id/snooze')
  @ApiOperation({ summary: 'Snooze alert group', description: 'Temporarily silences notifications for an alert group for a specified duration.' })
  @ApiQuery({ name: 'duration', required: false, type: String, description: 'Duration in minutes', example: '60' })
  @ApiResponse({ status: 200, description: 'Alert group snoozed' })
  async snoozeAlert(
    @WorkspaceId() workspaceId: string,
    @DbUser() user: User,
    @Param('id') groupId: string,
    @Query('duration') duration?: string,
  ) {
    const durationMinutes = duration ? parseInt(duration, 10) : 60;
    const result = await this.alertsService.snoozeAlert(workspaceId, groupId, durationMinutes, user.id);
    if (!result) {
      throw new NotFoundException('Alert group not found');
    }
    return result;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update alert group', description: 'Updates alert group properties like assignee or runbook URL.' })
  @ApiResponse({ status: 200, description: 'Alert group updated' })
  async updateAlertGroup(
    @WorkspaceId() workspaceId: string,
    @Param('id') groupId: string,
    @Body() body: { assigneeUserId?: string; runbookUrl?: string },
  ) {
    const result = await this.alertsService.updateAlertGroup(workspaceId, groupId, body);
    if (!result) {
      throw new NotFoundException('Alert group not found');
    }
    return result;
  }
}
