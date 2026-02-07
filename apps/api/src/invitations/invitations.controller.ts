import { Controller, Post, Get, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ApiOrClerkAuthGuard } from '../auth/api-or-clerk-auth.guard';
import { PermissionsGuard, RequirePermission, RESOURCES } from '../permissions/permissions.guard';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { DbUser } from '../common/decorators/db-user.decorator';
import { User } from '@signalcraft/database';

@ApiTags('invitations')
@ApiBearerAuth()
@UseGuards(ApiOrClerkAuthGuard, PermissionsGuard)
@Controller('api/invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) { }

  @Post()
  @RequirePermission(RESOURCES.USERS, 'WRITE')
  @ApiOperation({ summary: 'Invite a new member to the workspace' })
  async inviteMember(
    @WorkspaceId() workspaceId: string,
    @DbUser() user: User,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationsService.createInvitation(workspaceId, user.id, dto);
  }

  @Get()
  @RequirePermission(RESOURCES.USERS, 'READ')
  @ApiOperation({ summary: 'List all invitations for the workspace' })
  async listInvitations(@WorkspaceId() workspaceId: string) {
    return this.invitationsService.listInvitations(workspaceId);
  }

  @Get(':token')
  @ApiOperation({ summary: 'Verify an invitation token and get details' })
  @ApiParam({ name: 'token', description: 'Invitation token' })
  async verifyInvitation(@Param('token') token: string) {
    return this.invitationsService.verifyInvitation(token);
  }

  @Post('accept')
  @ApiOperation({ summary: 'Accept a workspace invitation' })
  async acceptInvitation(@Req() req: any, @Body() dto: AcceptInvitationDto) {
    // req.user contains clerk info. We need clerkId and email.
    return this.invitationsService.acceptInvitation(dto, req.user.clerkId, req.user.email);
  }

  @Delete(':id')
  @RequirePermission(RESOURCES.USERS, 'WRITE')
  @ApiOperation({ summary: 'Revoke a pending invitation' })
  @ApiParam({ name: 'id', description: 'Invitation ID' })
  async revokeInvitation(
    @WorkspaceId() workspaceId: string,
    @DbUser() user: User,
    @Param('id') id: string,
  ) {
    return this.invitationsService.revokeInvitation(workspaceId, id, user.id);
  }
}
