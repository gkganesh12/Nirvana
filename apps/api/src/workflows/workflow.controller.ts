import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowService } from './workflow.service';
import { CreateWorkflowDto, UpdateWorkflowDto } from './dto/workflow.dto';
import { ApiOrClerkAuthGuard } from '../auth/api-or-clerk-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { DbUser } from '../common/decorators/db-user.decorator';

@ApiTags('Workflows')
@ApiBearerAuth()
@Controller('api/workflows')
@UseGuards(ApiOrClerkAuthGuard, RolesGuard)
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post()
  @Roles('ADMIN' as any, 'OWNER' as any)
  @ApiOperation({ summary: 'Create a new remediation workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created successfully' })
  async createWorkflow(
    @WorkspaceId() workspaceId: string,
    @DbUser() user: any,
    @Body() dto: CreateWorkflowDto,
  ) {
    return this.workflowService.createWorkflow(workspaceId, user.id, dto);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List available workflow templates' })
  @ApiResponse({ status: 200, description: 'Workflow templates retrieved successfully' })
  async listTemplates() {
    return this.workflowService.getTemplates();
  }

  @Get()
  @ApiOperation({ summary: 'List all workflows in workspace' })
  @ApiResponse({ status: 200, description: 'Workflows retrieved successfully' })
  async listWorkflows(@WorkspaceId() workspaceId: string) {
    return this.workflowService.listWorkflows(workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow details' })
  @ApiResponse({ status: 200, description: 'Workflow retrieved successfully' })
  async getWorkflow(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.workflowService.getWorkflow(id, workspaceId);
  }

  @Patch(':id')
  @Roles('ADMIN' as any, 'OWNER' as any)
  @ApiOperation({ summary: 'Update workflow' })
  @ApiResponse({ status: 200, description: 'Workflow updated successfully' })
  async updateWorkflow(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: UpdateWorkflowDto,
  ) {
    return this.workflowService.updateWorkflow(id, workspaceId, dto);
  }

  @Delete(':id')
  @Roles('ADMIN' as any, 'OWNER' as any)
  @ApiOperation({ summary: 'Delete workflow' })
  @ApiResponse({ status: 200, description: 'Workflow deleted successfully' })
  async deleteWorkflow(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.workflowService.deleteWorkflow(id, workspaceId);
  }

  @Post(':id/execute')
  @Roles('ADMIN' as any, 'OWNER' as any, 'MEMBER' as any)
  @ApiOperation({ summary: 'Manually execute workflow for an alert' })
  @ApiResponse({ status: 200, description: 'Workflow execution started' })
  async executeWorkflow(@Param('id') id: string, @Body('alertId') alertId: string) {
    const executionId = await this.workflowService.executeWorkflow(id, alertId);
    return { executionId, message: 'Workflow execution started' };
  }

  @Get(':id/executions')
  @ApiOperation({ summary: 'Get workflow execution history' })
  @ApiResponse({ status: 200, description: 'Execution history retrieved successfully' })
  async getExecutionHistory(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.workflowService.getExecutionHistory(id, workspaceId);
  }
}
