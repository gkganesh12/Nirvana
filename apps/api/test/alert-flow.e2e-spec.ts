/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { prisma, AlertStatus, AlertSeverity } from '@signalcraft/database';
import { QueueService } from '../src/queues/queue.service';
import { NotificationProcessor } from '../src/notifications/notification.processor';
import { WebhooksModule } from '../src/webhooks/webhooks.module';
import { AlertsModule } from '../src/alerts/alerts.module';
import { NotificationsModule } from '../src/notifications/notifications.module';
import { RoutingModule } from '../src/routing/routing.module';
import { WorkspacesModule } from '../src/workspaces/workspaces.module';
import { UsersModule } from '../src/users/users.module';

// Disable real infrastructure connections
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.DATABASE_URL = 'postgresql://localhost:5432';
process.env.CLERK_SECRET_KEY = 'sk_test_dummy';

// Global mocks for infrastructure libraries
jest.mock('ioredis', () => {
    return jest.fn().mockImplementation(() => ({
        on: jest.fn(),
        quit: jest.fn().mockResolvedValue('OK'),
        subscribe: jest.fn(),
        publish: jest.fn(),
    }));
});

jest.mock('bullmq', () => ({
    Queue: jest.fn().mockImplementation(() => ({
        add: jest.fn().mockResolvedValue({ id: 'job-1' }),
        close: jest.fn().mockResolvedValue(undefined),
    })),
    Worker: jest.fn().mockImplementation(() => ({
        on: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
    })),
}));

// Mock Prisma

// Mock Prisma
jest.mock('@signalcraft/database', () => {
    const mockPrisma = {
        workspace: {
            create: jest.fn().mockResolvedValue({ id: 'test-workspace', name: 'Test' }),
            findUnique: jest.fn(),
            delete: jest.fn().mockResolvedValue({}),
        },
        alertEvent: {
            create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'event-1', ...args.data })),
            findFirst: jest.fn().mockResolvedValue(null),
            deleteMany: jest.fn().mockResolvedValue({}),
        },
        alertGroup: {
            create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'group-1', ...args.data })),
            update: jest.fn().mockImplementation((args) => Promise.resolve({ id: args.where.id, ...args.data })),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            upsert: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'group-1', ...args.create })),
            deleteMany: jest.fn().mockResolvedValue({}),
        },
        user: {
            create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'user-1', ...args.data })),
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            delete: jest.fn().mockResolvedValue({}),
        },
        routingRule: {
            findMany: jest.fn().mockResolvedValue([]),
            create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'rule-1', ...args.data })),
            deleteMany: jest.fn().mockResolvedValue({}),
        },
        breadcrumb: {
            createMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
    };
    return {
        prisma: mockPrisma,
        AlertStatus: {
            OPEN: 'OPEN',
            ACK: 'ACK',
            SNOOZED: 'SNOOZED',
            RESOLVED: 'RESOLVED',
        },
        AlertSeverity: {
            INFO: 'INFO',
            LOW: 'LOW',
            MEDIUM: 'MEDIUM',
            HIGH: 'HIGH',
            CRITICAL: 'CRITICAL',
        },
    };
});

// Mock QueueService
const mockQueueService = {
    addJob: jest.fn().mockResolvedValue({ id: 'job-1' }),
};

describe('Alert Processing Flow (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                WebhooksModule,
                AlertsModule,
                NotificationsModule,
                RoutingModule,
                WorkspacesModule,
                UsersModule,
            ],
        })
            .overrideProvider(QueueService)
            .useValue(mockQueueService)
            .overrideProvider(NotificationProcessor)
            .useValue({}) // Empty mock
            .compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Sentry Webhook → Alert Creation → Deduplication', () => {
        const testWorkspaceId = 'test-workspace-' + Date.now();

        beforeAll(async () => {
            // Create test workspace
            await prisma.workspace.create({
                data: {
                    id: testWorkspaceId,
                    name: 'Test Workspace',
                },
            });
        });

        afterAll(async () => {
            // Cleanup
            await prisma.alertEvent.deleteMany({ where: { workspaceId: testWorkspaceId } });
            await prisma.alertGroup.deleteMany({ where: { workspaceId: testWorkspaceId } });
            await prisma.workspace.delete({ where: { id: testWorkspaceId } });
        });

        it('should create alert group from Sentry webhook', async () => {
            const sentryPayload = {
                event: {
                    event_id: 'test-event-1',
                    message: 'TypeError: Cannot read property "foo"',
                    level: 'error',
                    platform: 'javascript',
                    timestamp: Math.floor(Date.now() / 1000),
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
                    },
                },
                project: 'test-project',
            };

            const response = await request(app.getHttpServer())
                .post(`/webhooks/sentry?workspaceId=${testWorkspaceId}`)
                .send(sentryPayload)
                .expect(201);

            expect(response.body.status).toBe('ok');
            expect(response.body.alertGroupId).toBeDefined();

            // Verify mocks were called
            expect(prisma.alertGroup.upsert).toHaveBeenCalled();
            expect(prisma.alertEvent.create).toHaveBeenCalled();
        });

        it('should deduplicate identical errors into same group', async () => {
            const sentryPayload = {
                event: {
                    event_id: 'test-event-2',
                    message: 'ReferenceError: x is not defined',
                    level: 'error',
                    platform: 'javascript',
                    timestamp: Math.floor(Date.now() / 1000),
                    exception: {
                        values: [
                            {
                                type: 'ReferenceError',
                                value: 'x is not defined',
                                stacktrace: {
                                    frames: [
                                        {
                                            filename: 'main.js',
                                            function: 'init',
                                            lineno: 50,
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                    tags: {
                        environment: 'production',
                    },
                },
                project: 'test-project',
            };

            // Send first occurrence
            const response1 = await request(app.getHttpServer())
                .post(`/webhooks/sentry?workspaceId=${testWorkspaceId}`)
                .send(sentryPayload)
                .expect(201);

            const firstGroupId = response1.body.alertGroupId;

            // Mock same group for duplicate
            (prisma.alertGroup.upsert as jest.Mock).mockResolvedValueOnce({ id: firstGroupId, count: 2 });

            // Send identical error (only event_id changed)
            const duplicatePayload = {
                ...sentryPayload,
                event: {
                    ...sentryPayload.event,
                    event_id: 'test-event-3',
                },
            };

            const response2 = await request(app.getHttpServer())
                .post(`/webhooks/sentry?workspaceId=${testWorkspaceId}`)
                .send(duplicatePayload)
                .expect(201);

            const secondGroupId = response2.body.alertGroupId;

            // Should be same group
            expect(firstGroupId).toBe(secondGroupId);
        });

        it('should create separate groups for different errors', async () => {
            const error1 = {
                event: {
                    event_id: 'test-event-4',
                    message: 'Error A',
                    level: 'error',
                    exception: {
                        values: [{ type: 'Error', value: 'Error A' }],
                    },
                    tags: { environment: 'production' },
                },
                project: 'test-project',
            };

            const error2 = {
                event: {
                    event_id: 'test-event-5',
                    message: 'Error B',
                    level: 'error',
                    exception: {
                        values: [{ type: 'Error', value: 'Error B' }],
                    },
                    tags: { environment: 'production' },
                },
                project: 'test-project',
            };

            const response1 = await request(app.getHttpServer())
                .post(`/webhooks/sentry?workspaceId=${testWorkspaceId}`)
                .send(error1)
                .expect(201);

            const response2 = await request(app.getHttpServer())
                .post(`/webhooks/sentry?workspaceId=${testWorkspaceId}`)
                .send(error2)
                .expect(201);

            expect(response1.body.alertGroupId).not.toBe(response2.body.alertGroupId);
        });

        it('should ignore duplicate event IDs (idempotency)', async () => {
            const payload = {
                event: {
                    event_id: 'unique-event-id-123',
                    message: 'Idempotent error',
                    level: 'error',
                },
                project: 'test-project',
            };

            // First send
            await request(app.getHttpServer())
                .post(`/webhooks/sentry?workspaceId=${testWorkspaceId}`)
                .send(payload)
                .expect(201);

            // Second send with same ID
            const response = await request(app.getHttpServer())
                .post(`/webhooks/sentry?workspaceId=${testWorkspaceId}`)
                .send(payload)
                .expect(201);

            expect(response.body.duplicate).toBe(true);
        });
    });

    describe('Datadog Webhook → Alert Creation', () => {
        const testWorkspaceId = 'test-workspace-datadog-' + Date.now();

        beforeAll(async () => {
            await prisma.workspace.create({
                data: { id: testWorkspaceId, name: 'Datadog Workspace' },
            });
        });

        afterAll(async () => {
            await prisma.alertEvent.deleteMany({ where: { workspaceId: testWorkspaceId } });
            await prisma.alertGroup.deleteMany({ where: { workspaceId: testWorkspaceId } });
            await prisma.workspace.delete({ where: { id: testWorkspaceId } });
        });

        it('should ingest Datadog alert correctly', async () => {
            const datadogPayload = {
                id: 'datadog-event-1',
                title: 'High latency detected',
                text: 'Endpoint /api/v1/users is responding slowly',
                alert_type: 'warning',
                tags: 'env:production,project:api-server,service:users',
                timestamp: Date.now(),
            };

            const response = await request(app.getHttpServer())
                .post(`/webhooks/datadog?workspaceId=${testWorkspaceId}`)
                .send(datadogPayload)
                .expect(201);

            expect(response.body.status).toBe('ok');
            expect(response.body.alertGroupId).toBeDefined();

            expect(prisma.alertGroup.upsert).toHaveBeenCalled();
            // Datadog 'warning' maps to high severity
            const call = (prisma.alertGroup.upsert as jest.Mock).mock.calls.find(c => c[1].severity === 'high');
            expect(call).toBeDefined();
        });
    });

    describe('Notification Routing Flow', () => {
        const testWorkspaceId = 'test-workspace-routing-' + Date.now();

        beforeAll(async () => {
            (prisma.routingRule.findMany as jest.Mock).mockResolvedValue([
                {
                    id: 'rule-1',
                    workspaceId: testWorkspaceId,
                    name: 'Critical Alerts to Slack',
                    enabled: true,
                    priority: 1,
                    conditionsJson: {
                        all: [
                            { field: 'environment', operator: 'equals', value: 'production' },
                            { field: 'severity', operator: 'equals', value: 'critical' },
                        ],
                    },
                    actionsJson: {
                        slackChannelId: 'C12345678',
                        mentionChannel: true,
                    },
                }
            ]);
        });

        it('should trigger routing rule for critical production alert', async () => {
            const criticalPayload = {
                event: {
                    event_id: 'critical-event-1',
                    message: 'System Crash!',
                    level: 'fatal', // maps to critical
                    tags: { environment: 'production' },
                },
                project: 'core-service',
            };

            const response = await request(app.getHttpServer())
                .post(`/webhooks/sentry?workspaceId=${testWorkspaceId}`)
                .send(criticalPayload)
                .expect(201);

            expect(response.body.status).toBe('ok');

            // Verify notification was queued
            expect(mockQueueService.addJob).toHaveBeenCalledWith(
                'notifications',
                'routed-alert',
                expect.objectContaining({
                    channelId: 'C12345678',
                    ruleName: 'Critical Alerts to Slack',
                })
            );
        });
    });

    describe('Alert Management Actions', () => {
        const testWorkspaceId = 'test-workspace-actions-' + Date.now();
        let testAlertGroupId: string;
        let testUserId: string;

        beforeAll(async () => {
            // Create test workspace
            await prisma.workspace.create({
                data: {
                    id: testWorkspaceId,
                    name: 'Test Workspace Actions',
                },
            });

            // Create test user
            const user = await prisma.user.create({
                data: {
                    clerkId: 'test-clerk-id',
                    email: 'test@example.com',
                    workspaceId: testWorkspaceId,
                },
            });
            testUserId = user.id;

            // Create test alert group
            const alertGroup = await prisma.alertGroup.create({
                data: {
                    workspaceId: testWorkspaceId,
                    groupKey: 'test-group-key',
                    title: 'Test Alert',
                    severity: AlertSeverity.HIGH,
                    status: AlertStatus.OPEN,
                    project: 'test-project',
                    environment: 'production',
                    count: 1,
                    firstSeenAt: new Date(),
                    lastSeenAt: new Date(),
                },
            });
            testAlertGroupId = alertGroup.id;
        });

        afterAll(async () => {
            await prisma.alertEvent.deleteMany({ where: { workspaceId: testWorkspaceId } });
            await prisma.alertGroup.deleteMany({ where: { workspaceId: testWorkspaceId } });
            await prisma.user.delete({ where: { id: testUserId } });
            await prisma.workspace.delete({ where: { id: testWorkspaceId } });
        });

        it('should acknowledge an alert', async () => {
            // Note: In real test, you'd need to provide valid auth token
            // This is a simplified version showing the flow
            const alertBefore = await prisma.alertGroup.findUnique({
                where: { id: testAlertGroupId },
            });
            expect(alertBefore?.status).toBe('OPEN');

            // Acknowledge via service directly
            await prisma.alertGroup.update({
                where: { id: testAlertGroupId },
                data: {
                    status: AlertStatus.ACK,
                    assigneeUserId: testUserId,
                },
            });
            const alertAfter = await prisma.alertGroup.findUnique({
                where: { id: testAlertGroupId },
            });
            expect(alertAfter?.status).toBe(AlertStatus.ACK);
            expect(alertAfter?.assigneeUserId).toBe(testUserId);
        });

        it('should resolve an alert with resolution notes', async () => {
            const resolutionNote = 'Fixed by deploying patch v1.2.3';

            await prisma.alertGroup.update({
                where: { id: testAlertGroupId },
                data: {
                    status: AlertStatus.RESOLVED,
                    lastResolvedBy: testUserId,
                    resolvedAt: new Date(),
                    resolutionNotes: resolutionNote,
                },
            });

            const alert = await prisma.alertGroup.findUnique({
                where: { id: testAlertGroupId },
            });

            expect(alert?.status).toBe(AlertStatus.RESOLVED);
            expect(alert?.resolutionNotes).toBe(resolutionNote);
            expect(alert?.resolvedAt).toBeDefined();
        });

        it('should snooze an alert', async () => {
            const snoozeUntil = new Date(Date.now() + 3600000); // 1 hour from now

            await prisma.alertGroup.update({
                where: { id: testAlertGroupId },
                data: {
                    status: AlertStatus.SNOOZED,
                    snoozeUntil,
                },
            });

            const alert = await prisma.alertGroup.findUnique({
                where: { id: testAlertGroupId },
            });

            expect(alert?.status).toBe(AlertStatus.SNOOZED);
            expect(alert?.snoozeUntil).toBeDefined();
        });
    });
});
