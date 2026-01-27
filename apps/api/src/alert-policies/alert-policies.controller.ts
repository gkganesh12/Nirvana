import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ApiOrClerkAuthGuard } from '../auth/api-or-clerk-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { DbUser } from '../common/decorators/db-user.decorator';
import { User } from '@signalcraft/database';
import { AlertPoliciesService } from './alert-policies.service';
import {
  CreateAlertPolicyDto,
  UpdateAlertPolicyDto,
  UpsertAlertPolicyDto,
} from './dto/alert-policy.dto';

@ApiTags('alert-policies')
@ApiBearerAuth()
@Controller('api/alert-policies')
@UseGuards(ApiOrClerkAuthGuard, RolesGuard)
@Roles('OWNER', 'ADMIN', 'MEMBER')
export class AlertPoliciesController {
  constructor(private readonly alertPoliciesService: AlertPoliciesService) {}

  @Get()
  @ApiOperation({ summary: 'List alert policies' })
  async listPolicies(@WorkspaceId() workspaceId: string) {
    return this.alertPoliciesService.listPolicies(workspaceId);
  }

  @Post()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create alert policy' })
  async createPolicy(
    @WorkspaceId() workspaceId: string,
    @DbUser() user: User,
    @Body() dto: CreateAlertPolicyDto,
  ) {
    return this.alertPoliciesService.createPolicy(workspaceId, user.id, dto);
  }

  @Post('upsert')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Upsert alert policy by externalId or name' })
  async upsertPolicy(
    @WorkspaceId() workspaceId: string,
    @DbUser() user: User,
    @Body() dto: UpsertAlertPolicyDto,
  ) {
    return this.alertPoliciesService.upsertPolicy(workspaceId, user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get alert policy' })
  @ApiParam({ name: 'id', description: 'Alert policy ID' })
  async getPolicy(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.alertPoliciesService.getPolicy(workspaceId, id);
  }

  @Put(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update alert policy' })
  @ApiParam({ name: 'id', description: 'Alert policy ID' })
  async updatePolicy(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAlertPolicyDto,
  ) {
    return this.alertPoliciesService.updatePolicy(workspaceId, id, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Delete alert policy' })
  @ApiParam({ name: 'id', description: 'Alert policy ID' })
  async deletePolicy(@WorkspaceId() workspaceId: string, @Param('id') id: string) {
    return this.alertPoliciesService.deletePolicy(workspaceId, id);
  }

  @Delete('external/:externalId')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Delete alert policy by externalId' })
  @ApiParam({ name: 'externalId', description: 'External ID (namespace/name)' })
  async deletePolicyByExternalId(
    @WorkspaceId() workspaceId: string,
    @Param('externalId') externalId: string,
  ) {
    return this.alertPoliciesService.deletePolicyByExternalId(workspaceId, externalId);
  }
}
