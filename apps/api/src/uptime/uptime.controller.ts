import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ApiOrClerkAuthGuard } from '../auth/api-or-clerk-auth.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { UptimeService } from './uptime.service';

class CreateUptimeCheckDto {
  name!: string;
  url!: string;
  method?: string;
  interval?: number;
  timeout?: number;
  headers?: Record<string, string>;
  expectedStatus?: number;
}

class UpdateUptimeCheckDto {
  name?: string;
  url?: string;
  method?: string;
  interval?: number;
  timeout?: number;
  enabled?: boolean;
  headers?: Record<string, string>;
  expectedStatus?: number;
}

@ApiTags('uptime')
@ApiBearerAuth()
@UseGuards(ApiOrClerkAuthGuard)
@Controller('api/uptime')
export class UptimeController {
  constructor(private readonly uptimeService: UptimeService) {}

  @Post('checks')
  @ApiOperation({ summary: 'Create an uptime check' })
  async createCheck(@WorkspaceId() workspaceId: string, @Body() dto: CreateUptimeCheckDto) {
    return this.uptimeService.createCheck(workspaceId, dto);
  }

  @Get('checks')
  @ApiOperation({ summary: 'List uptime checks with stats' })
  async listChecks(@WorkspaceId() workspaceId: string) {
    return this.uptimeService.listChecks(workspaceId);
  }

  @Get('checks/:id')
  @ApiOperation({ summary: 'Get check history' })
  async getCheckHistory(
    @WorkspaceId() workspaceId: string,
    @Param('id') checkId: string,
    @Query('hours') hours?: string,
  ) {
    return this.uptimeService.getCheckHistory(
      workspaceId,
      checkId,
      hours ? parseInt(hours, 10) : 24,
    );
  }

  @Patch('checks/:id')
  @ApiOperation({ summary: 'Update an uptime check' })
  async updateCheck(
    @WorkspaceId() workspaceId: string,
    @Param('id') checkId: string,
    @Body() dto: UpdateUptimeCheckDto,
  ) {
    return this.uptimeService.updateCheck(workspaceId, checkId, dto);
  }

  @Delete('checks/:id')
  @ApiOperation({ summary: 'Delete an uptime check' })
  async deleteCheck(@WorkspaceId() workspaceId: string, @Param('id') checkId: string) {
    return this.uptimeService.deleteCheck(workspaceId, checkId);
  }

  @Post('checks/:id/run')
  @ApiOperation({ summary: 'Manually run an uptime check' })
  async runCheck(@Param('id') checkId: string) {
    await this.uptimeService.executeCheck(checkId);
    return { message: 'Check executed' };
  }
}
