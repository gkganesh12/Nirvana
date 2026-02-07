/**
 * Routing Rules Service
 *
 * CRUD operations for routing rules with validation and cache invalidation.
 *
 * @module routing/routing-rules.service
 */
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@signalcraft/database';
import {
  CreateRoutingRuleDto,
  UpdateRoutingRuleDto,
  ConditionGroup,
  RuleActions,
  RuleCondition,
} from '@signalcraft/shared';
import { RulesEngineService } from './rules-engine.service';
import { AuditService } from '../audit/audit.service';

// Allowed fields for conditions
const ALLOWED_FIELDS = [
  'environment',
  'env',
  'severity',
  'project',
  'service',
  'title',
  'source',
  'status',
  'count',
];

// Allowed operators
const ALLOWED_OPERATORS = [
  'equals',
  'not_equals',
  'in',
  'not_in',
  'contains',
  'not_contains',
  'regex',
  'greater_than',
  'greater_than_or_equals',
  'less_than',
  'less_than_or_equals',
];

@Injectable()
export class RoutingRulesService {
  private readonly logger = new Logger(RoutingRulesService.name);

  constructor(
    private readonly rulesEngine: RulesEngineService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * List all routing rules for a workspace
   */
  async listRules(
    workspaceId: string,
    options: { enabled?: boolean; limit?: number; offset?: number } = {},
  ) {
    const { enabled, limit = 50, offset = 0 } = options;

    const where = {
      workspaceId,
      ...(enabled !== undefined ? { enabled } : {}),
    };

    const [rules, total] = await Promise.all([
      prisma.routingRule.findMany({
        where,
        orderBy: { priority: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.routingRule.count({ where }),
    ]);

    return {
      rules: rules.map((rule) => this.formatRule(rule)),
      total,
      limit,
      offset,
    };
  }

  /**
   * Get a single routing rule by ID
   */
  async getRule(workspaceId: string, ruleId: string) {
    const rule = await prisma.routingRule.findFirst({
      where: { id: ruleId, workspaceId },
    });

    if (!rule) {
      throw new NotFoundException(`Routing rule not found: ${ruleId}`);
    }

    return this.formatRule(rule);
  }

  /**
   * Create a new routing rule
   */
  async createRule(workspaceId: string, dto: CreateRoutingRuleDto, actorId?: string) {
    // Validate conditions and actions
    this.validateConditions(dto.conditions);
    await this.validateActions(workspaceId, dto.actions);

    // Get next priority if not specified
    const priority = dto.priority ?? (await this.getNextPriority(workspaceId));

    const rule = await prisma.routingRule.create({
      data: {
        workspaceId,
        name: dto.name,
        description: dto.description,
        conditionsJson: dto.conditions as object,
        actionsJson: dto.actions as object,
        priority,
        enabled: dto.enabled ?? true,
      },
    });

    // Invalidate cache
    this.rulesEngine.invalidateCache(workspaceId);

    if (actorId) {
      await this.auditService.log({
        workspaceId,
        userId: actorId,
        action: 'CREATE_ROUTING_RULE',
        resourceType: 'RoutingRule',
        resourceId: rule.id,
        metadata: { name: rule.name },
      });
    }

    return this.formatRule(rule);
  }

  /**
   * Update an existing routing rule
   */
  async updateRule(
    workspaceId: string,
    ruleId: string,
    dto: UpdateRoutingRuleDto,
    actorId?: string,
  ) {
    // Verify rule exists
    const existing = await prisma.routingRule.findFirst({
      where: { id: ruleId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException(`Routing rule not found: ${ruleId}`);
    }

    // Validate if conditions/actions are being updated
    if (dto.conditions) {
      this.validateConditions(dto.conditions);
    }
    if (dto.actions) {
      await this.validateActions(workspaceId, dto.actions);
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.conditions !== undefined) updateData.conditionsJson = dto.conditions as object;
    if (dto.actions !== undefined) updateData.actionsJson = dto.actions as object;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.enabled !== undefined) updateData.enabled = dto.enabled;

    const rule = await prisma.routingRule.update({
      where: { id: ruleId },
      data: updateData,
    });

    // Invalidate cache
    this.rulesEngine.invalidateCache(workspaceId);

    if (actorId) {
      await this.auditService.log({
        workspaceId,
        userId: actorId,
        action: 'UPDATE_ROUTING_RULE',
        resourceType: 'RoutingRule',
        resourceId: rule.id,
        metadata: { name: rule.name },
      });
    }

    return this.formatRule(rule);
  }

  /**
   * Delete a routing rule
   */
  async deleteRule(workspaceId: string, ruleId: string, actorId?: string) {
    const existing = await prisma.routingRule.findFirst({
      where: { id: ruleId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException(`Routing rule not found: ${ruleId}`);
    }

    await prisma.routingRule.delete({
      where: { id: ruleId },
    });

    // Invalidate cache
    this.rulesEngine.invalidateCache(workspaceId);

    if (actorId) {
      await this.auditService.log({
        workspaceId,
        userId: actorId,
        action: 'DELETE_ROUTING_RULE',
        resourceType: 'RoutingRule',
        resourceId: ruleId,
        metadata: { name: existing.name },
      });
    }

    return { success: true };
  }

  /**
   * Enable a routing rule
   */
  async enableRule(workspaceId: string, ruleId: string) {
    return this.updateRule(workspaceId, ruleId, { enabled: true });
  }

  /**
   * Disable a routing rule
   */
  async disableRule(workspaceId: string, ruleId: string) {
    return this.updateRule(workspaceId, ruleId, { enabled: false });
  }

  /**
   * Reorder rules by updating priorities
   */
  async reorderRules(workspaceId: string, ruleIds: string[]) {
    // Verify all rules exist and belong to workspace
    const rules = await prisma.routingRule.findMany({
      where: { id: { in: ruleIds }, workspaceId },
    });

    if (rules.length !== ruleIds.length) {
      throw new BadRequestException('Some rule IDs are invalid or do not belong to this workspace');
    }

    // Update priorities in a transaction
    await prisma.$transaction(
      ruleIds.map((ruleId, index) =>
        prisma.routingRule.update({
          where: { id: ruleId },
          data: { priority: index },
        }),
      ),
    );

    // Invalidate cache
    this.rulesEngine.invalidateCache(workspaceId);

    this.logger.log(`Rules reordered`, { workspaceId, count: ruleIds.length });

    return { success: true };
  }

  // ==================== Validation Methods ====================

  private validateConditions(conditions: ConditionGroup): void {
    if (
      !conditions ||
      ((!conditions.all || conditions.all.length === 0) &&
        (!conditions.any || conditions.any.length === 0))
    ) {
      throw new BadRequestException('At least one condition is required');
    }

    const allConditions = [...(conditions.all ?? []), ...(conditions.any ?? [])];

    for (const condition of allConditions) {
      this.validateSingleCondition(condition);
    }
  }

  private validateSingleCondition(condition: RuleCondition): void {
    // Check field is allowed
    const field = condition.field;
    const isTagField = field.startsWith('tags.');

    if (!isTagField && !ALLOWED_FIELDS.includes(field)) {
      throw new BadRequestException(`Invalid condition field: ${field}`);
    }

    // Check operator is allowed
    if (!ALLOWED_OPERATORS.includes(condition.operator)) {
      throw new BadRequestException(`Invalid condition operator: ${condition.operator}`);
    }

    // Validate value based on operator
    if (['in', 'not_in'].includes(condition.operator)) {
      if (!Array.isArray(condition.value)) {
        throw new BadRequestException(`Operator ${condition.operator} requires an array value`);
      }
    }

    // Validate regex is valid
    if (condition.operator === 'regex' && typeof condition.value === 'string') {
      try {
        new RegExp(condition.value);
      } catch {
        throw new BadRequestException(`Invalid regex pattern: ${condition.value}`);
      }
    }
  }

  private async validateActions(workspaceId: string, actions: RuleActions): Promise<void> {
    const hasSlack = Boolean(actions.slackChannelId);
    const hasTeams = Boolean(actions.sendToTeams);
    const hasDiscord = Boolean(actions.sendToDiscord);
    const hasPagerDuty = Boolean(actions.createPagerDutyIncident);
    const hasOpsgenie = Boolean(actions.createOpsgenieAlert);

    if (!hasSlack && !hasTeams && !hasDiscord && !hasPagerDuty && !hasOpsgenie) {
      throw new BadRequestException('At least one notification action is required');
    }

    if (actions.escalationPolicyId) {
      const prismaClient = prisma as any;
      const policy = await prismaClient.escalationPolicy.findFirst({
        where: { id: actions.escalationPolicyId, workspaceId },
        select: { id: true },
      });
      if (!policy) {
        throw new BadRequestException('Escalation policy not found');
      }
    }

    if (actions.escalateAfterMinutes !== undefined) {
      if (typeof actions.escalateAfterMinutes !== 'number' || actions.escalateAfterMinutes < 1) {
        throw new BadRequestException('Escalation time must be a positive number of minutes');
      }
      if (!hasSlack) {
        throw new BadRequestException('Slack channel is required for escalations');
      }
    }
  }

  // ==================== Helper Methods ====================

  private async getNextPriority(workspaceId: string): Promise<number> {
    const lastRule = await prisma.routingRule.findFirst({
      where: { workspaceId },
      orderBy: { priority: 'desc' },
    });

    return (lastRule?.priority ?? -1) + 1;
  }

  private formatRule(rule: {
    id: string;
    workspaceId: string;
    name: string;
    description: string | null;
    conditionsJson: unknown;
    actionsJson: unknown;
    priority: number;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: rule.id,
      workspaceId: rule.workspaceId,
      name: rule.name,
      description: rule.description,
      conditions: rule.conditionsJson as ConditionGroup,
      actions: rule.actionsJson as RuleActions,
      priority: rule.priority,
      enabled: rule.enabled,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }
}
