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
                    timestamp: 1704672000,
                    exception: {
                        values: [
                            {
                                type: 'TypeError',
                                value: 'Cannot read property "foo" of undefined',
                                stacktrace: {
                                    frames: [
                                        {
                                            filename: 'app.js',
                                            function: 'handleClick',
                                            lineno: 123,
                                            colno: 45,
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                    tags: {
                        environment: 'production',
                        release: 'v1.0.0',
                    },
                    user: {
                        id: 'user123',
                        email: 'user@example.com',
                    },
                },
                project: 'web-app',
            };

            const normalized = service.normalizeSentry(sentryPayload);

            expect(normalized).toMatchObject({
                title: expect.stringContaining('TypeError'),
                message: expect.any(String),
                severity: 'HIGH',
                project: 'web-app',
                environment: 'production',
                source: 'sentry',
            });
            expect(normalized.tags).toBeDefined();
            expect(normalized.stack).toBeDefined();
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
                event: {
                    message: 'Error occurred',
                },
                project: 'minimal-app',
            };

            const normalized = service.normalizeSentry(minimalPayload);

            expect(normalized).toMatchObject({
                title: 'Error occurred',
                message: 'Error occurred',
                severity: 'MEDIUM', // default
                project: 'minimal-app',
                environment: 'production', // default
                source: 'sentry',
            });
        });

        it('should extract stack trace from exception', () => {
            const payload = {
                event: {
                    message: 'Error',
                    exception: {
                        values: [
                            {
                                type: 'Error',
                                stacktrace: {
                                    frames: [
                                        { filename: 'app.js', function: 'main', lineno: 10 },
                                        { filename: 'lib.js', function: 'helper', lineno: 25 },
                                    ],
                                },
                            },
                        ],
                    },
                },
                project: 'test',
            };

            const normalized = service.normalizeSentry(payload);

            expect(normalized.stack).toBeDefined();
            expect(normalized.stack).toContain('app.js');
            expect(normalized.stack).toContain('lib.js');
        });

        it('should extract environment from tags', () => {
            const payload = {
                event: {
                    message: 'Error',
                    tags: {
                        environment: 'staging',
                    },
                },
                project: 'test',
            };

            const normalized = service.normalizeSentry(payload);
            expect(normalized.environment).toBe('staging');
        });

        it('should include user context when available', () => {
            const payload = {
                event: {
                    message: 'Error',
                    user: {
                        id: 'user-456',
                        email: 'test@example.com',
                        username: 'testuser',
                    },
                },
                project: 'test',
            };

            const normalized = service.normalizeSentry(payload);
            expect(normalized.tags).toMatchObject({
                'user.id': 'user-456',
                'user.email': 'test@example.com',
            });
        });
    });

    describe('inferSeverity', () => {
        it('should infer CRITICAL for fatal errors', () => {
            expect(service.inferSeverity('fatal', 'OutOfMemoryError')).toBe('CRITICAL');
        });

        it('should infer HIGH for errors', () => {
            expect(service.inferSeverity('error', 'TypeError')).toBe('HIGH');
        });

        it('should infer MEDIUM for warnings', () => {
            expect(service.inferSeverity('warning', 'Deprecated API')).toBe('MEDIUM');
        });

        it('should infer LOW for info messages', () => {
            expect(service.inferSeverity('info', 'User logged in')).toBe('LOW');
        });

        it('should infer INFO for debug messages', () => {
            expect(service.inferSeverity('debug', 'Cache hit')).toBe('INFO');
        });

        it('should default to MEDIUM for unknown levels', () => {
            expect(service.inferSeverity('unknown', 'Something happened')).toBe('MEDIUM');
        });
    });
});
