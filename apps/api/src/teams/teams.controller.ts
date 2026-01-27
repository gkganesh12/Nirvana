import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiOrClerkAuthGuard } from '../auth/api-or-clerk-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { DbUser } from '../common/decorators/db-user.decorator';
import { User } from '@signalcraft/database';
import { TeamsService } from './teams.service';
import { AddTeamMemberDto, CreateTeamDto, UpdateTeamDto } from './dto/team.dto';

@ApiTags('teams')
@ApiBearerAuth()
@Controller('api/teams')
@UseGuards(ApiOrClerkAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN', 'MEMBER')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @ApiOperation({ summary: 'List teams' })
  async listTeams(@WorkspaceId() workspaceId: string) {
    return this.teamsService.listTeams(workspaceId);
  }

  @Post()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create team' })
  async createTeam(
    @WorkspaceId() workspaceId: string,
    @DbUser() user: User,
    @Body() dto: CreateTeamDto,
  ) {
    return this.teamsService.createTeam(workspaceId, user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team details' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  async getTeam(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.teamsService.getTeam(workspaceId, id);
  }

  @Put(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update team' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  async updateTeam(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teamsService.updateTeam(workspaceId, id, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Delete team' })
  @ApiParam({ name: 'id', description: 'Team ID' })
  async deleteTeam(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.teamsService.deleteTeam(workspaceId, id);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List team members' })
  async listMembers(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.teamsService.listMembers(workspaceId, id);
  }

  @Post(':id/members')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Add team member' })
  async addMember(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: AddTeamMemberDto,
  ) {
    return this.teamsService.addMember(workspaceId, id, dto.userId);
  }

  @Delete(':id/members/:userId')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Remove team member' })
  async removeMember(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ) {
    return this.teamsService.removeMember(workspaceId, id, userId);
  }
}
