/**
 * Routing Rules Type Definitions
 * Production-level type safety for the routing engine
 */

// Condition operators supported by the rules engine
export type ConditionOperator =
    | 'equals'
    | 'not_equals'
    | 'in'
    | 'not_in'
    | 'contains'
    | 'not_contains'
    | 'regex'
    | 'greater_than'
    | 'greater_than_or_equals'
    | 'less_than'
    | 'less_than_or_equals';

// Fields that can be evaluated in conditions
export type ConditionField =
    | 'environment'
    | 'severity'
    | 'project'
    | 'title'
    | 'source'
    | 'status'
    | 'count'
    | `tags.${string}`;

// Severity levels for comparison
export type SeverityLevel = 'info' | 'low' | 'med' | 'high' | 'critical';

// Severity numeric ranking for comparison operators
export const SEVERITY_RANK: Record<SeverityLevel, number> = {
    info: 1,
    low: 2,
    med: 3,
    high: 4,
    critical: 5,
};

// Single condition structure
export interface RuleCondition {
    field: ConditionField;
    operator: ConditionOperator;
    value: string | string[] | number | boolean;
    caseSensitive?: boolean;
}

// Logical grouping of conditions
export interface ConditionGroup {
    all?: RuleCondition[];  // AND logic
    any?: RuleCondition[];  // OR logic
}

// Action types for routing rules
export interface RuleActions {
    slackChannelId: string;
    mentionHere?: boolean;
    mentionChannel?: boolean;
    escalateAfterMinutes?: number;
    escalationChannelId?: string;
    escalationMentionHere?: boolean;
}

// Complete routing rule structure
export interface RoutingRule {
    id: string;
    workspaceId: string;
    name: string;
    description?: string;
    conditions: ConditionGroup;
    actions: RuleActions;
    priority: number;
    enabled: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Rule evaluation result
export interface RuleEvaluationResult {
    ruleId: string;
    ruleName: string;
    matched: boolean;
    matchedConditions: string[];
    failedConditions: string[];
    actions?: RuleActions;
    evaluatedAt: Date;
}

// Alert data for rule evaluation
export interface AlertForEvaluation {
    id: string;
    workspaceId: string;
    environment: string;
    severity: string;
    project: string;
    title: string;
    source: string;
    status: string;
    count: number;
    tags: Record<string, string>;
}

// Escalation job data
export interface EscalationJobData {
    workspaceId: string;
    alertGroupId: string;
    escalationLevel: number;
    escalateAfterMinutes: number;
    channelId: string;
    mentionHere: boolean;
    originalNotificationTs?: string;
    scheduledAt: Date;
}

// Snooze configuration
export interface SnoozeConfig {
    alertGroupId: string;
    durationHours: number;
    snoozeUntil: Date;
    snoozedBy?: string;
}

// Auto-close configuration
export interface AutoCloseConfig {
    inactivityDays: number;
    enabled: boolean;
}

// API DTOs
export interface CreateRoutingRuleDto {
    name: string;
    description?: string;
    conditions: ConditionGroup;
    actions: RuleActions;
    priority?: number;
    enabled?: boolean;
}

export interface UpdateRoutingRuleDto {
    name?: string;
    description?: string;
    conditions?: ConditionGroup;
    actions?: RuleActions;
    priority?: number;
    enabled?: boolean;
}

export interface TestRuleDto {
    conditions: ConditionGroup;
    alert: AlertForEvaluation;
}

export interface TestRuleResult {
    matched: boolean;
    matchedConditions: string[];
    failedConditions: string[];
    evaluationDetails: {
        field: string;
        operator: string;
        expected: unknown;
        actual: unknown;
        result: boolean;
    }[];
}
