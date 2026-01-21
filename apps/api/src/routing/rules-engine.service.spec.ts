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

    describe('testRule', () => {
        it('should match "equals" condition', () => {
            const conditions = {
                all: [{ field: 'severity' as any, operator: 'equals' as any, value: 'critical' }]
            };
            const alert: any = { severity: 'critical', project: 'web-app' };

            const result = service.testRule(conditions, alert);
            expect(result.matched).toBe(true);
        });

        it('should not match "equals" when values differ', () => {
            const conditions = {
                all: [{ field: 'severity' as any, operator: 'equals' as any, value: 'critical' }]
            };
            const alert: any = { severity: 'high', project: 'web-app' };

            const result = service.testRule(conditions, alert);
            expect(result.matched).toBe(false);
        });

        it('should match "contains" condition', () => {
            const conditions = {
                all: [{ field: 'title' as any, operator: 'contains' as any, value: 'timeout' }]
            };
            const alert: any = {
                title: 'Connection timeout occurred',
                severity: 'high',
            };

            const result = service.testRule(conditions, alert);
            expect(result.matched).toBe(true);
        });

        it('should match "in" condition with array', () => {
            const conditions = {
                all: [{ field: 'environment' as any, operator: 'in' as any, value: ['production', 'staging'] }]
            };
            const alert: any = { environment: 'production', severity: 'high' };

            const result = service.testRule(conditions, alert);
            expect(result.matched).toBe(true);
        });

        it('should match "greater_than" for severity rank', () => {
            const conditions = {
                all: [{ field: 'severity' as any, operator: 'greater_than' as any, value: 'low' }]
            };
            const alert: any = {
                severity: 'critical',
            };

            const result = service.testRule(conditions, alert);
            expect(result.matched).toBe(true);
        });
    });

    describe('getFirstMatchingRule', () => {
        it('should find first matching enabled rule', async () => {
            const mockRules = [
                {
                    id: 'rule1',
                    name: 'Rule 1',
                    priority: 1,
                    enabled: true,
                    conditionsJson: {
                        all: [{ field: 'severity', operator: 'equals', value: 'critical' }],
                    },
                    actionsJson: { slackChannelId: 'C123' },
                    workspaceId: 'ws-1',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ];

            (prisma.routingRule.findMany as jest.Mock).mockResolvedValue(mockRules);

            const alert: any = {
                severity: 'critical',
                project: 'web-app',
                environment: 'production',
            };

            const result = await service.getFirstMatchingRule('ws-1', alert);

            expect(result).toBeDefined();
            expect(result?.ruleId).toBe('rule1');
        });

        it('should return null when no rules match', async () => {
            (prisma.routingRule.findMany as jest.Mock).mockResolvedValue([]);

            const alert: any = { severity: 'low', project: 'web-app' };
            const result = await service.getFirstMatchingRule('ws-1', alert);

            expect(result).toBeNull();
        });
    });
});
