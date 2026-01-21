/**
 * Routing Rules Controller
 * 
 * RESTful API endpoints for managing routing rules.
 * 
 * @module routing/routing-rules.controller
 */
import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RoutingRulesService } from './routing-rules.service';
import { RulesEngineService } from './rules-engine.service';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { DbUser } from '../common/decorators/db-user.decorator';
import { User } from '@signalcraft/database';
import {
    CreateRoutingRuleDto,
    UpdateRoutingRuleDto,
    TestRuleDto,
} from '@signalcraft/shared';

@ApiTags('routing-rules')
@ApiBearerAuth()
@Controller('api/routing-rules')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class RoutingRulesController {
    private readonly logger = new Logger(RoutingRulesController.name);

    constructor(
        private readonly routingRulesService: RoutingRulesService,
        private readonly rulesEngineService: RulesEngineService,
    ) { }

    @Get()
    @ApiOperation({ summary: 'List all routing rules for the workspace' })
    @ApiQuery({ name: 'enabled', required: false, type: Boolean })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'offset', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'List of routing rules' })
    async listRules(
        @WorkspaceId() workspaceId: string,
        @Query('enabled') enabled?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        return this.routingRulesService.listRules(workspaceId, {
            enabled: enabled !== undefined ? enabled === 'true' : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
        });
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a single routing rule by ID' })
    @ApiResponse({ status: 200, description: 'Routing rule details' })
    @ApiResponse({ status: 404, description: 'Rule not found' })
    async getRule(
        @WorkspaceId() workspaceId: string,
        @Param('id') id: string,
    ) {
        return this.routingRulesService.getRule(workspaceId, id);
    }

    @Post()
    @ApiOperation({ summary: 'Create a new routing rule' })
    @ApiResponse({ status: 201, description: 'Rule created successfully' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    async createRule(
        @WorkspaceId() workspaceId: string,
        @DbUser() user: User,
        @Body() dto: CreateRoutingRuleDto,
    ) {
        return this.routingRulesService.createRule(workspaceId, dto, user.id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update an existing routing rule' })
    @ApiResponse({ status: 200, description: 'Rule updated successfully' })
    @ApiResponse({ status: 404, description: 'Rule not found' })
    @ApiResponse({ status: 400, description: 'Validation error' })
    async updateRule(
        @WorkspaceId() workspaceId: string,
        @DbUser() user: User,
        @Param('id') id: string,
        @Body() dto: UpdateRoutingRuleDto,
    ) {
        return this.routingRulesService.updateRule(workspaceId, id, dto, user.id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a routing rule' })
    @ApiResponse({ status: 200, description: 'Rule deleted successfully' })
    @ApiResponse({ status: 404, description: 'Rule not found' })
    async deleteRule(
        @WorkspaceId() workspaceId: string,
        @DbUser() user: User,
        @Param('id') id: string,
    ) {
        return this.routingRulesService.deleteRule(workspaceId, id, user.id);
    }

    @Post(':id/enable')
    @ApiOperation({ summary: 'Enable a routing rule' })
    @ApiResponse({ status: 200, description: 'Rule enabled successfully' })
    @ApiResponse({ status: 404, description: 'Rule not found' })
    async enableRule(
        @WorkspaceId() workspaceId: string,
        @Param('id') id: string,
    ) {
        return this.routingRulesService.enableRule(workspaceId, id);
    }

    @Post(':id/disable')
    @ApiOperation({ summary: 'Disable a routing rule' })
    @ApiResponse({ status: 200, description: 'Rule disabled successfully' })
    @ApiResponse({ status: 404, description: 'Rule not found' })
    async disableRule(
        @WorkspaceId() workspaceId: string,
        @Param('id') id: string,
    ) {
        return this.routingRulesService.disableRule(workspaceId, id);
    }

    @Post('reorder')
    @ApiOperation({ summary: 'Reorder routing rules by priority' })
    @ApiResponse({ status: 200, description: 'Rules reordered successfully' })
    @ApiResponse({ status: 400, description: 'Invalid rule IDs' })
    async reorderRules(
        @WorkspaceId() workspaceId: string,
        @Body() body: { ruleIds: string[] },
    ) {
        return this.routingRulesService.reorderRules(workspaceId, body.ruleIds);
    }

    @Post('test')
    @ApiOperation({ summary: 'Test a rule against a sample alert' })
    @ApiResponse({ status: 200, description: 'Test result' })
    async testRule(@Body() dto: TestRuleDto) {
        const result = this.rulesEngineService.testRule(dto.conditions, dto.alert);

        return {
            matched: result.matched,
            evaluationDetails: result.details,
        };
    }
}
