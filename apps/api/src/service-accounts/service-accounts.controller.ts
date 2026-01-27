import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ServiceAccountsService } from './service-accounts.service';
import { CreateServiceAccountDto, CreateServiceAccountKeyDto } from './dto/service-account.dto';

@ApiTags('Service Accounts')
@ApiBearerAuth()
@Controller('api/service-accounts')
@UseGuards(ClerkAuthGuard)
export class ServiceAccountsController {
  constructor(private readonly serviceAccountsService: ServiceAccountsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a service account' })
  @ApiBody({ type: CreateServiceAccountDto })
  async createServiceAccount(
    @WorkspaceId() workspaceId: string,
    @CurrentUser() user: { clerkId?: string },
    @Body() dto: CreateServiceAccountDto,
  ) {
    return this.serviceAccountsService.createServiceAccount(workspaceId, user?.clerkId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List service accounts for workspace' })
  async listServiceAccounts(@WorkspaceId() workspaceId: string) {
    return this.serviceAccountsService.listServiceAccounts(workspaceId);
  }

  @Post(':id/keys')
  @ApiOperation({ summary: 'Create API key for a service account' })
  @ApiBody({ type: CreateServiceAccountKeyDto })
  async createServiceAccountKey(
    @WorkspaceId() workspaceId: string,
    @Param('id') serviceAccountId: string,
    @CurrentUser() user: { clerkId?: string },
    @Body() dto: CreateServiceAccountKeyDto,
  ) {
    return this.serviceAccountsService.createServiceAccountKey(
      workspaceId,
      serviceAccountId,
      user?.clerkId,
      dto,
    );
  }

  @Get(':id/keys')
  @ApiOperation({ summary: 'List API keys for a service account' })
  async listServiceAccountKeys(
    @WorkspaceId() workspaceId: string,
    @Param('id') serviceAccountId: string,
  ) {
    return this.serviceAccountsService.listServiceAccountKeys(workspaceId, serviceAccountId);
  }

  @Delete(':id/keys/:keyId')
  @ApiOperation({ summary: 'Revoke API key for a service account' })
  async revokeServiceAccountKey(
    @WorkspaceId() workspaceId: string,
    @Param('id') serviceAccountId: string,
    @Param('keyId') keyId: string,
  ) {
    await this.serviceAccountsService.revokeServiceAccountKey(workspaceId, serviceAccountId, keyId);
    return { success: true, message: 'API key revoked' };
  }
}
