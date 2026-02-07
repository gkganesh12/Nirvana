import { Test, TestingModule } from '@nestjs/testing';
import { NormalizationService } from './normalization.service';

describe('NormalizationService', () => {
  let service: NormalizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NormalizationService],
    }).compile();

    service = module.get<NormalizationService>(NormalizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('normalizeSentry', () => {
    it('should extract basic fields from Sentry payload', () => {
      const sentryPayload = {
        event: {
          event_id: 'abc123',
          message: 'TypeError: Cannot read property',
          level: 'error',
          platform: 'javascript',
          timestamp: '2024-01-01T00:00:00Z',
          tags: [
            ['environment', 'production'],
            ['release', 'v1.0.0'],
          ],
        },
        project: 'web-app',
      };

      const normalized = service.normalizeSentry(sentryPayload);

      expect(normalized).toMatchObject({
        title: 'Sentry Issue',
        description: 'TypeError: Cannot read property',
        severity: 'HIGH',
        project: 'web-app',
        environment: 'production',
        source: 'SENTRY',
      });
      expect(normalized.tags).toBeDefined();
    });

    it('should map Sentry levels to severity correctly', () => {
      const levels = [
        { sentry: 'fatal', expected: 'CRITICAL' },
        { sentry: 'error', expected: 'HIGH' },
        { sentry: 'warning', expected: 'MEDIUM' },
        { sentry: 'info', expected: 'LOW' },
        { sentry: 'debug', expected: 'INFO' },
      ];

      levels.forEach(({ sentry, expected }) => {
        const payload = {
          event: {
            event_id: `test-${sentry}`,
            message: 'Test',
            level: sentry,
          },
          project: 'test',
        };

        const normalized = service.normalizeSentry(payload);
        expect(normalized.severity).toBe(expected);
      });
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalPayload = {
        data: {
          event_id: 'minimal-123',
        },
        project: 'minimal-app',
      };

      const normalized = service.normalizeSentry(minimalPayload);

      expect(normalized).toMatchObject({
        severity: 'INFO', // default
        project: 'minimal-app',
        environment: 'unknown', // default
        source: 'SENTRY',
      });
    });

    it('should extract environment from tags', () => {
      const payload = {
        event: {
          event_id: 'env-123',
          message: 'Error',
          tags: [['environment', 'staging']],
        },
        project: 'test',
      };

      const normalized = service.normalizeSentry(payload);
      expect(normalized.environment).toBe('staging');
    });

    it('should include user count when available', () => {
      const payload = {
        data: { event_id: 'user-123' },
        user_count: 42,
        project: 'test',
      };

      const normalized = service.normalizeSentry(payload);
      expect(normalized.userCount).toBe(42);
    });
  });
});
