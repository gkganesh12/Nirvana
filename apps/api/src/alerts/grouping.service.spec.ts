import { Test, TestingModule } from '@nestjs/testing';
import { GroupingService } from './grouping.service';
import { AnomalyDetectionService } from './anomaly-detection.service';

describe('GroupingService', () => {
    let service: GroupingService;
    let anomalyService: AnomalyDetectionService;

    beforeEach(async () => {
        anomalyService = {
            checkVelocityAnomaly: jest.fn().mockResolvedValue(false),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GroupingService,
                {
                    provide: AnomalyDetectionService,
                    useValue: anomalyService,
                },
            ],
        }).compile();

        service = module.get<GroupingService>(GroupingService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('generateGroupKey', () => {
        it('should generate consistent group key for same input', () => {
            const input = {
                source: 'sentry',
                project: 'web-app',
                environment: 'production',
                fingerprint: 'abc123',
                title: 'TypeError',
                message: 'Error message',
                severity: 'high' as const,
                occurredAt: new Date(),
            };

            const groupKey1 = service.generateGroupKey(input);
            const groupKey2 = service.generateGroupKey(input);

            expect(groupKey1).toBe(groupKey2);
            expect(groupKey1).toMatch(/^[a-f0-9]{64}$/); // SHA256 hash
        });

        it('should generate different keys for different projects', () => {
            const input1 = {
                source: 'sentry',
                project: 'web-app',
                environment: 'production',
                fingerprint: 'abc123',
                title: 'Error',
                message: 'Error',
                severity: 'high' as const,
                occurredAt: new Date(),
            };

            const input2 = {
                ...input1,
                project: 'api-service',
            };

            const groupKey1 = service.generateGroupKey(input1);
            const groupKey2 = service.generateGroupKey(input2);

            expect(groupKey1).not.toBe(groupKey2);
        });

        it('should generate different keys for different environments', () => {
            const input1 = {
                source: 'sentry',
                project: 'web-app',
                environment: 'production',
                fingerprint: 'abc123',
                title: 'Error',
                message: 'Error',
                severity: 'high' as const,
                occurredAt: new Date(),
            };

            const input2 = {
                ...input1,
                environment: 'staging',
            };

            const groupKey1 = service.generateGroupKey(input1);
            const groupKey2 = service.generateGroupKey(input2);

            expect(groupKey1).not.toBe(groupKey2);
        });

        it('should normalize case when generating key', () => {
            const input1 = {
                source: 'Sentry',
                project: 'Web-App',
                environment: 'Production',
                fingerprint: 'ABC123',
                title: 'Error',
                message: 'Error',
                severity: 'high' as const,
                occurredAt: new Date(),
            };

            const input2 = {
                source: 'sentry',
                project: 'web-app',
                environment: 'production',
                fingerprint: 'abc123',
                title: 'Error',
                message: 'Error',
                severity: 'high' as const,
                occurredAt: new Date(),
            };

            const groupKey1 = service.generateGroupKey(input1);
            const groupKey2 = service.generateGroupKey(input2);

            // Should be the same after normalization
            expect(groupKey1).toBe(groupKey2);
        });
    });

    describe('mapSeverityRank', () => {
        it('should rank CRITICAL as highest', () => {
            const rank = service['mapSeverityRank']('CRITICAL' as any);
            expect(rank).toBe(5);
        });

        it('should rank HIGH appropriately', () => {
            const rank = service['mapSeverityRank']('HIGH' as any);
            expect(rank).toBe(4);
        });

        it('should rank MEDIUM in middle', () => {
            const rank = service['mapSeverityRank']('MEDIUM' as any);
            expect(rank).toBe(3);
        });

        it('should rank LOW lower', () => {
            const rank = service['mapSeverityRank']('LOW' as any);
            expect(rank).toBe(2);
        });

        it('should rank INFO as lowest', () => {
            const rank = service['mapSeverityRank']('INFO' as any);
            expect(rank).toBe(1);
        });
    });
});
