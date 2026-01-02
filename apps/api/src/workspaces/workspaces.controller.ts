import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WorkspacesService } from './workspaces.service';

@ApiTags('workspaces')
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @ApiBearerAuth()
  @UseGuards(ClerkAuthGuard)
  @Get('current')
  async current(@CurrentUser() user: { clerkId: string }) {
    return this.workspacesService.getByClerkId(user.clerkId);
  }
}
