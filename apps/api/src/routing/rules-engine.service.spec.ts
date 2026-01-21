import { Test, TestingModule } from '@nestjs/testing';
import { RulesEngineService } from './rules-engine.service';
import { prisma } from '@signalcraft/database';

// Mock Prisma
jest.mock('@signalcraft/database', () => ({
    prisma: {
        routingRule: {
            findMany: jest.fn(),
        },
    },
}));

describe('RulesEngineService', () => {
    let service: RulesEngineService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [RulesEngineService],
        }).compile();

        service = module.get<RulesEngineService>(RulesEngineService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('evaluateCondition', () => {
        it('should match "equals" condition', () => {
            const condition = {
                field: 'severity',
                operator: 'equals' as const,
                value: 'CRITICAL',
            };
            const alert = { severity: 'CRITICAL', project: 'web-app' };

            expect(service.evaluateCondition(condition, alert)).toBe(true);
        });

        it('should not match "equals" when values differ', () => {
            const condition = {
                field: 'severity',
                operator: 'equals' as const,
                value: 'CRITICAL',
            };
            const alert = { severity: 'HIGH', project: 'web-app' };

            expect(service.evaluateCondition(condition, alert)).toBe(false);
        });

        it('should match "contains" condition', () => {
            const condition = {
                field: 'message',
                operator: 'contains' as const,
                value: 'timeout',
            };
            const alert = {
                message: 'Connection timeout occurred',
                severity: 'HIGH',
            };

            expect(service.evaluateCondition(condition, alert)).toBe(true);
        });

        it('should match "startsWith" condition', () => {
            const condition = {
                field: 'project',
                operator: 'startsWith' as const,
                value: 'web-',
            };
            const alert = { project: 'web-app-frontend', severity: 'HIGH' };

            expect(service.evaluateCondition(condition, alert)).toBe(true);
        });

        it('should match "in" condition with array', () => {
            const condition = {
                field: 'environment',
                operator: 'in' as const,
                value: ['production', 'staging'],
            };
            const alert = { environment: 'production', severity: 'HIGH' };

            expect(service.evaluateCondition(condition, alert)).toBe(true);
        });

        it('should not match "in" condition when value not in array', () => {
            const condition = {
                field: 'environment',
                operator: 'in' as const,
                value: ['production', 'staging'],
            };
            const alert = { environment: 'development', severity: 'HIGH' };

            expect(service.evaluateCondition(condition, alert)).toBe(false);
        });

        it('should match "exists" condition when field is present', () => {
            const condition = {
                field: 'user.id',
                operator: 'exists' as const,
                value: true,
            };
            const alert = {
                severity: 'HIGH',
                tags: { 'user.id': 'user123' },
            };

            expect(service.evaluateCondition(condition, alert)).toBe(true);
        });

        it('should match "greaterThan" for numeric values', () => {
            const condition = {
                field: 'eventCount',
                operator: 'greaterThan' as const,
                value: 10,
            };
            const alert = {
                severity: 'HIGH',
                eventCount: 15,
            };

            expect(service.evaluateCondition(condition, alert)).toBe(true);
        });
    });

    describe('evaluateConditionGroup', () => {
        it('should evaluate AND group correctly (all true)', () => {
            const group = {
                operator: 'AND' as const,
                conditions: [
                    { field: 'severity', operator: 'equals' as const, value: 'CRITICAL' },
                    { field: 'environment', operator: 'equals' as const, value: 'production' },
                ],
            };
            const alert = {
                severity: 'CRITICAL',
                environment: 'production',
                project: 'web-app',
            };

            expect(service.evaluateConditionGroup(group, alert)).toBe(true);
        });

        it('should evaluate AND group correctly (one false)', () => {
            const group = {
                operator: 'AND' as const,
                conditions: [
                    { field: 'severity', operator: 'equals' as const, value: 'CRITICAL' },
                    { field: 'environment', operator: 'equals' as const, value: 'production' },
                ],
            };
            const alert = {
                severity: 'CRITICAL',
                environment: 'staging', // doesn't match
                project: 'web-app',
            };

            expect(service.evaluateConditionGroup(group, alert)).toBe(false);
        });

        it('should evaluate OR group correctly (at least one true)', () => {
            const group = {
                operator: 'OR' as const,
                conditions: [
                    { field: 'severity', operator: 'equals' as const, value: 'CRITICAL' },
                    { field: 'severity', operator: 'equals' as const, value: 'HIGH' },
                ],
            };
            const alert = {
                severity: 'HIGH', // matches second condition
                environment: 'production',
            };

            expect(service.evaluateConditionGroup(group, alert)).toBe(true);
        });

        it('should evaluate OR group correctly (all false)', () => {
            const group = {
                operator: 'OR' as const,
                conditions: [
                    { field: 'severity', operator: 'equals' as const, value: 'CRITICAL' },
                    { field: 'severity', operator: 'equals' as const, value: 'HIGH' },
                ],
            };
            const alert = {
                severity: 'MEDIUM', // doesn't match any
                environment: 'production',
            };

            expect(service.evaluateConditionGroup(group, alert)).toBe(false);
        });

        it('should handle nested condition groups', () => {
            const group = {
                operator: 'AND' as const,
                conditions: [
                    { field: 'project', operator: 'equals' as const, value: 'web-app' },
                ],
                groups: [
                    {
                        operator: 'OR' as const,
                        conditions: [
                            { field: 'severity', operator: 'equals' as const, value: 'CRITICAL' },
                            { field: 'severity', operator: 'equals' as const, value: 'HIGH' },
                        ],
                    },
                ],
            };
            const alert = {
                project: 'web-app',
                severity: 'HIGH',
            };

            expect(service.evaluateConditionGroup(group, alert)).toBe(true);
        });
    });

    describe('findMatchingRule', () => {
        it('should find first matching enabled rule', async () => {
            const mockRules = [
                {
                    id: 'rule1',
                    priority: 1,
                    enabled: true,
                    conditions: {
                        operator: 'AND',
                        conditions: [
                            { field: 'severity', operator: 'equals', value: 'CRITICAL' },
                        ],
                    },
                    actions: [{ type: 'slack', config: { channel: '#alerts' } }],
                },
                {
                    id: 'rule2',
                    priority: 2,
                    enabled: true,
                    conditions: {
                        operator: 'AND',
                        conditions: [
                            { field: 'severity', operator: 'equals', value: 'HIGH' },
                        ],
                    },
                    actions: [{ type: 'slack', config: { channel: '#warnings' } }],
                },
            ];

            (prisma.routingRule.findMany as jest.Mock).mockResolvedValue(mockRules);

            const alert = {
                severity: 'CRITICAL',
                project: 'web-app',
                environment: 'production',
            };

            const matchingRule = await service.findMatchingRule('workspace123', alert);

            expect(matchingRule).toBeDefined();
            expect(matchingRule?.id).toBe('rule1');
        });

        it('should skip disabled rules', async () => {
            const mockRules = [
                {
                    id: 'rule1',
                    priority: 1,
                    enabled: false, // disabled
                    conditions: {
                        operator: 'AND',
                        conditions: [
                            { field: 'severity', operator: 'equals', value: 'CRITICAL' },
                        ],
                    },
                    actions: [],
                },
                {
                    id: 'rule2',
                    priority: 2,
                    enabled: true,
                    conditions: {
                        operator: 'AND',
                        conditions: [
                            { field: 'severity', operator: 'equals', value: 'CRITICAL' },
                        ],
                    },
                    actions: [],
                },
            ];

            (prisma.routingRule.findMany as jest.Mock).mockResolvedValue(mockRules);

            const alert = { severity: 'CRITICAL', project: 'web-app' };
            const matchingRule = await service.findMatchingRule('workspace123', alert);

            expect(matchingRule?.id).toBe('rule2'); // should match the enabled rule
        });

        it('should return null when no rules match', async () => {
            const mockRules = [
                {
                    id: 'rule1',
                    priority: 1,
                    enabled: true,
                    conditions: {
                        operator: 'AND',
                        conditions: [
                            { field: 'severity', operator: 'equals', value: 'CRITICAL' },
                        ],
                    },
                    actions: [],
                },
            ];

            (prisma.routingRule.findMany as jest.Mock).mockResolvedValue(mockRules);

            const alert = { severity: 'LOW', project: 'web-app' };
            const matchingRule = await service.findMatchingRule('workspace123', alert);

            expect(matchingRule).toBeNull();
        });
    });
});
