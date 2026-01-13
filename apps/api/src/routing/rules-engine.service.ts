/**
 * Routing Rules Engine Service
 * 
 * Production-level rules engine that evaluates alert properties against
 * configured routing rules and executes matching actions.
 * 
 * @module routing/rules-engine.service
 */
import { Injectable, Logger } from '@nestjs/common';
import { prisma, AlertGroup, RoutingRule } from '@signalcraft/database';
import {
    ConditionGroup,
    RuleCondition,
    ConditionOperator,
    RuleActions,
    RuleEvaluationResult,
    AlertForEvaluation,
    SEVERITY_RANK,
    SeverityLevel,
} from '@signalcraft/shared';

// Internal cache for rules (invalidated on rule changes)
interface RulesCache {
    rules: ParsedRoutingRule[];
    cachedAt: number;
}

interface ParsedRoutingRule {
    id: string;
    name: string;
    priority: number;
    conditions: ConditionGroup;
    actions: RuleActions;
}

@Injectable()
export class RulesEngineService {
    private readonly logger = new Logger(RulesEngineService.name);
    private readonly rulesCacheMap = new Map<string, RulesCache>();
    private readonly cacheTtlMs = 60_000; // 1 minute cache TTL

    /**
     * Evaluate all enabled routing rules for a given alert
     * Returns matching rules in priority order
     */
    async evaluateRules(
        workspaceId: string,
        alert: AlertForEvaluation,
    ): Promise<RuleEvaluationResult[]> {
        const startTime = Date.now();
        const rules = await this.getEnabledRules(workspaceId);
        const results: RuleEvaluationResult[] = [];

        for (const rule of rules) {
            const result = this.evaluateSingleRule(rule, alert);
            results.push(result);

            // Log matched rules for debugging
            if (result.matched) {
                this.logger.log(`Rule matched: ${rule.name}`, {
                    ruleId: rule.id,
                    alertId: alert.id,
                    workspaceId,
                });
            }
        }

        const evaluationTimeMs = Date.now() - startTime;
        this.logger.debug(`Rules evaluation completed`, {
            workspaceId,
            alertId: alert.id,
            rulesEvaluated: rules.length,
            rulesMatched: results.filter((r) => r.matched).length,
            evaluationTimeMs,
        });

        return results;
    }

    /**
     * Get the first matching rule (highest priority - lowest number)
     */
    async getFirstMatchingRule(
        workspaceId: string,
        alert: AlertForEvaluation,
    ): Promise<RuleEvaluationResult | null> {
        const rules = await this.getEnabledRules(workspaceId);

        for (const rule of rules) {
            const result = this.evaluateSingleRule(rule, alert);
            if (result.matched) {
                return result;
            }
        }

        return null;
    }

    /**
     * Get all matching rules
     */
    async getAllMatchingRules(
        workspaceId: string,
        alert: AlertForEvaluation,
    ): Promise<RuleEvaluationResult[]> {
        const results = await this.evaluateRules(workspaceId, alert);
        return results.filter((r) => r.matched);
    }

    /**
     * Test a rule against a sample alert (for rule builder UI)
     */
    testRule(
        conditions: ConditionGroup,
        alert: AlertForEvaluation,
    ): { matched: boolean; details: ConditionEvaluationDetail[] } {
        const details: ConditionEvaluationDetail[] = [];

        const allMatched = this.evaluateConditionGroup(conditions, alert, details);

        return { matched: allMatched, details };
    }

    /**
     * Invalidate the rules cache for a workspace (call when rules are modified)
     */
    invalidateCache(workspaceId: string): void {
        this.rulesCacheMap.delete(workspaceId);
        this.logger.debug(`Rules cache invalidated for workspace: ${workspaceId}`);
    }

    /**
     * Clear entire rules cache
     */
    clearAllCaches(): void {
        this.rulesCacheMap.clear();
        this.logger.debug('All rules caches cleared');
    }

    // ==================== Private Methods ====================

    private async getEnabledRules(workspaceId: string): Promise<ParsedRoutingRule[]> {
        // Check cache first
        const cached = this.rulesCacheMap.get(workspaceId);
        if (cached && Date.now() - cached.cachedAt < this.cacheTtlMs) {
            return cached.rules;
        }

        // Fetch from database
        const dbRules = await prisma.routingRule.findMany({
            where: {
                workspaceId,
                enabled: true,
            },
            orderBy: { priority: 'asc' }, // Lower priority number = higher priority
        });

        const parsedRules = dbRules.map((rule) => this.parseRule(rule));

        // Update cache
        this.rulesCacheMap.set(workspaceId, {
            rules: parsedRules,
            cachedAt: Date.now(),
        });

        return parsedRules;
    }

    private parseRule(rule: RoutingRule): ParsedRoutingRule {
        return {
            id: rule.id,
            name: rule.name,
            priority: rule.priority,
            conditions: rule.conditionsJson as unknown as ConditionGroup,
            actions: rule.actionsJson as unknown as RuleActions,
        };
    }

    private evaluateSingleRule(
        rule: ParsedRoutingRule,
        alert: AlertForEvaluation,
    ): RuleEvaluationResult {
        const details: ConditionEvaluationDetail[] = [];
        const matched = this.evaluateConditionGroup(rule.conditions, alert, details);

        return {
            ruleId: rule.id,
            ruleName: rule.name,
            matched,
            matchedConditions: details.filter((d) => d.result).map((d) => d.description),
            failedConditions: details.filter((d) => !d.result).map((d) => d.description),
            actions: matched ? rule.actions : undefined,
            evaluatedAt: new Date(),
        };
    }

    private evaluateConditionGroup(
        group: ConditionGroup,
        alert: AlertForEvaluation,
        details: ConditionEvaluationDetail[],
    ): boolean {
        // Evaluate ALL conditions (AND logic)
        if (group.all && group.all.length > 0) {
            const allResults = group.all.map((condition) =>
                this.evaluateCondition(condition, alert, details),
            );
            if (!allResults.every((r) => r)) {
                return false; // Short-circuit: if any ALL condition fails, rule doesn't match
            }
        }

        // Evaluate ANY conditions (OR logic)
        if (group.any && group.any.length > 0) {
            const anyResults = group.any.map((condition) =>
                this.evaluateCondition(condition, alert, details),
            );
            if (!anyResults.some((r) => r)) {
                return false; // If no ANY condition matches, rule doesn't match
            }
        }

        // If we get here, all conditions passed
        return true;
    }

    private evaluateCondition(
        condition: RuleCondition,
        alert: AlertForEvaluation,
        details: ConditionEvaluationDetail[],
    ): boolean {
        const fieldValue = this.extractFieldValue(condition.field, alert);
        const result = this.applyOperator(
            condition.operator,
            fieldValue,
            condition.value,
            condition.caseSensitive,
        );

        details.push({
            field: condition.field,
            operator: condition.operator,
            expected: condition.value,
            actual: fieldValue,
            result,
            description: `${condition.field} ${condition.operator} ${JSON.stringify(condition.value)}`,
        });

        return result;
    }

    private extractFieldValue(field: string, alert: AlertForEvaluation): unknown {
        // Handle nested tag access (e.g., "tags.team")
        if (field.startsWith('tags.')) {
            const tagKey = field.slice(5);
            return alert.tags?.[tagKey] ?? null;
        }

        // Map field names to alert properties
        switch (field) {
            case 'environment':
            case 'env':
                return alert.environment?.toLowerCase();
            case 'severity':
                return alert.severity?.toLowerCase();
            case 'project':
            case 'service':
                return alert.project?.toLowerCase();
            case 'title':
                return alert.title;
            case 'source':
                return alert.source?.toLowerCase();
            case 'status':
                return alert.status?.toLowerCase();
            case 'count':
                return alert.count;
            default:
                this.logger.warn(`Unknown field in condition: ${field}`);
                return null;
        }
    }

    private applyOperator(
        operator: ConditionOperator,
        actualValue: unknown,
        expectedValue: unknown,
        caseSensitive = false,
    ): boolean {
        // Normalize string values for comparison
        const normalize = (val: unknown): unknown => {
            if (typeof val === 'string' && !caseSensitive) {
                return val.toLowerCase();
            }
            return val;
        };

        const actual = normalize(actualValue);
        const expected = normalize(expectedValue);

        switch (operator) {
            case 'equals':
                return actual === expected;

            case 'not_equals':
                return actual !== expected;

            case 'in':
                if (!Array.isArray(expected)) return false;
                return expected.map(normalize).includes(actual);

            case 'not_in':
                if (!Array.isArray(expected)) return true;
                return !expected.map(normalize).includes(actual);

            case 'contains':
                if (typeof actual === 'string' && typeof expected === 'string') {
                    return actual.includes(expected);
                }
                if (Array.isArray(actual)) {
                    return actual.map(normalize).includes(expected);
                }
                return false;

            case 'not_contains':
                if (typeof actual === 'string' && typeof expected === 'string') {
                    return !actual.includes(expected);
                }
                if (Array.isArray(actual)) {
                    return !actual.map(normalize).includes(expected);
                }
                return true;

            case 'regex':
                if (typeof actual !== 'string' || typeof expected !== 'string') {
                    return false;
                }
                try {
                    const regex = new RegExp(expected, caseSensitive ? '' : 'i');
                    return regex.test(actual as string);
                } catch {
                    this.logger.warn(`Invalid regex pattern: ${expected}`);
                    return false;
                }

            case 'greater_than':
            case 'greater_than_or_equals':
            case 'less_than':
            case 'less_than_or_equals':
                return this.compareSeverity(operator, actual, expected);

            default:
                this.logger.warn(`Unknown operator: ${operator}`);
                return false;
        }
    }

    private compareSeverity(
        operator: ConditionOperator,
        actual: unknown,
        expected: unknown,
    ): boolean {
        // Get severity rank for comparison
        const actualRank = typeof actual === 'string'
            ? SEVERITY_RANK[actual as SeverityLevel] ?? 0
            : typeof actual === 'number' ? actual : 0;

        const expectedRank = typeof expected === 'string'
            ? SEVERITY_RANK[expected as SeverityLevel] ?? 0
            : typeof expected === 'number' ? expected : 0;

        switch (operator) {
            case 'greater_than':
                return actualRank > expectedRank;
            case 'greater_than_or_equals':
                return actualRank >= expectedRank;
            case 'less_than':
                return actualRank < expectedRank;
            case 'less_than_or_equals':
                return actualRank <= expectedRank;
            default:
                return false;
        }
    }
}

export interface ConditionEvaluationDetail {
    field: string;
    operator: string;
    expected: unknown;
    actual: unknown;
    result: boolean;
    description: string;
}
