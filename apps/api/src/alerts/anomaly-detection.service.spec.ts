import { Test, TestingModule } from '@nestjs/testing';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { prisma } from '@signalcraft/database';

jest.mock('@signalcraft/database', () => ({
    prisma: {
        alertGroup: {
            findUnique: jest.fn(),
        },
    },
    AlertSeverity: {
        INFO: 'INFO',
        LOW: 'LOW',
        MEDIUM: 'MEDIUM',
        HIGH: 'HIGH',
        CRITICAL: 'CRITICAL',
    },
}));

describe('AnomalyDetectionService', () => {
    let service: AnomalyDetectionService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [AnomalyDetectionService],
        }).compile();

        service = module.get<AnomalyDetectionService>(AnomalyDetectionService);
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('checkVelocityAnomaly', () => {
        it('should return false if group does not exist', async () => {
            (prisma.alertGroup.findUnique as jest.Mock).mockResolvedValue(null);
            const result = await service.checkVelocityAnomaly('ws-1', 'group-1', 10);
            expect(result).toBe(false);
        });

        it('should detect anomaly when velocity is 5x baseline', async () => {
            const mockGroup = {
                id: 'group-1',
                firstSeenAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
                count: 24, // 1 per hour baseline
            };
            (prisma.alertGroup.findUnique as jest.Mock).mockResolvedValue(mockGroup);

            // Baseline = 1/hr. Threshold = max(3, 10) = 10.
            // Wait, baseline calculation in service:
            // hoursActive = 24.
            // longTermVelocity = 24 / 24 = 1.
            // anomalyThreshold = max(1 * 3, 10) = 10.

            // So velocity 11 should be anomaly.
            const result = await service.checkVelocityAnomaly('ws-1', 'group-1', 11);
            expect(result).toBe(true);
        });

        it('should NOT detect anomaly when velocity is below minimum threshold', async () => {
            const mockGroup = {
                id: 'group-2',
                firstSeenAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
                count: 24, // 1 per hour baseline
            };
            (prisma.alertGroup.findUnique as jest.Mock).mockResolvedValue(mockGroup);

            // Threshold is 10.
            // Current velocity 5.
            const result = await service.checkVelocityAnomaly('ws-1', 'group-2', 5);
            expect(result).toBe(false);
        });
    });
});
