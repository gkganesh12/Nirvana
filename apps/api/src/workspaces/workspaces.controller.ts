import { Controller, Get, UseGuards, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { DbUser } from '../common/decorators/db-user.decorator';
import { WorkspacesService } from './workspaces.service';
import { WorkspaceRole, User } from '@signalcraft/database';

@ApiTags('Workspaces')
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) { }

  @ApiBearerAuth()
  @UseGuards(ClerkAuthGuard)
  @Get('current')
  @ApiOperation({ summary: 'Get current workspace', description: 'Retrieves the workspace associated with the currently authenticated user.' })
  @ApiResponse({ status: 200, description: 'Current workspace details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async current(@CurrentUser() user: { clerkId: string }) {
    return this.workspacesService.getByClerkId(user.clerkId);
  }

  @ApiBearerAuth()
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Get('members')
  @ApiOperation({ summary: 'List workspace members' })
  async getMembers(@WorkspaceId() workspaceId: string) {
    return this.workspacesService.getMembers(workspaceId);
  }

  @ApiBearerAuth()
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles('ADMIN' as any, 'OWNER' as any)
  @Patch('members/:userId')
  @ApiOperation({ summary: 'Update member role' })
  @ApiParam({ name: 'userId', description: 'User ID to update' })
  async updateMemberRole(
    @WorkspaceId() workspaceId: string,
    @DbUser() actor: User,
    @Param('userId') userId: string,
    @Body('role') role: string,
  ) {
    return this.workspacesService.updateMemberRole(workspaceId, userId, role, actor.id);
  }

  @ApiBearerAuth()
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles('ADMIN' as any, 'OWNER' as any)
  @Delete('members/:userId')
  @ApiOperation({ summary: 'Remove member from workspace' })
  @ApiParam({ name: 'userId', description: 'User ID to remove' })
  async removeMember(
    @WorkspaceId() workspaceId: string,
    @DbUser() actor: User,
    @Param('userId') userId: string,
  ) {
    return this.workspacesService.removeMember(workspaceId, userId, actor.id);
  }
}
