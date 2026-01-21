import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CreateDashboardDto, UpdateDashboardDto } from './dto/dashboard.dto';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { DbUser } from '../common/decorators/db-user.decorator';

@ApiTags('Dashboards')
@ApiBearerAuth()
@Controller('api/dashboards')
@UseGuards(ClerkAuthGuard)
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new custom dashboard' })
    @ApiResponse({ status: 201, description: 'Dashboard created successfully' })
    async createDashboard(
        @WorkspaceId() workspaceId: string,
        @DbUser() user: any,
        @Body() dto: CreateDashboardDto,
    ) {
        return this.dashboardService.createDashboard(workspaceId, user.id, dto);
    }

    @Get('templates')
    @ApiOperation({ summary: 'List available dashboard templates' })
    @ApiResponse({ status: 200, description: 'Dashboard templates retrieved successfully' })
    async listTemplates() {
        return this.dashboardService.getTemplates();
    }

    @Get()
    @ApiOperation({ summary: 'List all dashboards in workspace' })
    @ApiResponse({ status: 200, description: 'Dashboards retrieved successfully' })
    async listDashboards(@WorkspaceId() workspaceId: string) {
        return this.dashboardService.listDashboards(workspaceId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get dashboard details' })
    @ApiResponse({ status: 200, description: 'Dashboard retrieved successfully' })
    async getDashboard(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
        return this.dashboardService.getDashboard(id, workspaceId);
    }

    @Get(':id/data')
    @ApiOperation({ summary: 'Get dashboard with widget data' })
    @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
    async getDashboardData(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
        return this.dashboardService.getDashboardData(id, workspaceId);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update dashboard' })
    @ApiResponse({ status: 200, description: 'Dashboard updated successfully' })
    async updateDashboard(
        @Param('id') id: string,
        @WorkspaceId() workspaceId: string,
        @Body() dto: UpdateDashboardDto,
    ) {
        return this.dashboardService.updateDashboard(id, workspaceId, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete dashboard' })
    @ApiResponse({ status: 200, description: 'Dashboard deleted successfully' })
    async deleteDashboard(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
        return this.dashboardService.deleteDashboard(id, workspaceId);
    }
}
