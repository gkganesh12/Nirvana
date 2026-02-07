import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { ApiOrClerkAuthGuard } from '../auth/api-or-clerk-auth.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { PermissionsGuard, RequirePermission, RESOURCES } from '../permissions/permissions.guard';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @ApiBearerAuth()
  @UseGuards(ApiOrClerkAuthGuard, PermissionsGuard)
  @RequirePermission(RESOURCES.USERS, 'READ')
  @Get()
  async list(@WorkspaceId() workspaceId: string) {
    return this.usersService.listByWorkspace(workspaceId);
  }
}
