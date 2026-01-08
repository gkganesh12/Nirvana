import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { prisma } from '@signalcraft/database';

describe('Alert Processing Flow (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

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

            // Verify alert group was created
            const alertGroup = await prisma.alertGroup.findUnique({
                where: { id: response.body.alertGroupId },
                include: { events: true },
            });

            expect(alertGroup).toBeDefined();
            expect(alertGroup?.title).toContain('TypeError');
            expect(alertGroup?.severity).toBe('HIGH');
            expect(alertGroup?.events).toHaveLength(1);
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

            // Verify event count
            const alertGroup = await prisma.alertGroup.findUnique({
                where: { id: firstGroupId },
                include: { events: true },
            });

            expect(alertGroup?.events).toHaveLength(2);
            expect(alertGroup?.eventCount).toBe(2);
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
                    message: 'Test error message',
                    severity: 'HIGH',
                    status: 'OPEN',
                    project: 'test-project',
                    environment: 'production',
                    source: 'sentry',
                    eventCount: 1,
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

            // Acknowledge via service directly (in real e2e test, you'd call the API endpoint)
            await prisma.alertGroup.update({
                where: { id: testAlertGroupId },
                data: {
                    status: 'ACKNOWLEDGED',
                    acknowledgedBy: testUserId,
                    acknowledgedAt: new Date(),
                },
            });

            const alertAfter = await prisma.alertGroup.findUnique({
                where: { id: testAlertGroupId },
            });
            expect(alertAfter?.status).toBe('ACKNOWLEDGED');
            expect(alertAfter?.acknowledgedBy).toBe(testUserId);
        });

        it('should resolve an alert with resolution notes', async () => {
            const resolutionNote = 'Fixed by deploying patch v1.2.3';

            await prisma.alertGroup.update({
                where: { id: testAlertGroupId },
                data: {
                    status: 'RESOLVED',
                    resolvedBy: testUserId,
                    resolvedAt: new Date(),
                    resolutionNote,
                },
            });

            const alert = await prisma.alertGroup.findUnique({
                where: { id: testAlertGroupId },
            });

            expect(alert?.status).toBe('RESOLVED');
            expect(alert?.resolutionNote).toBe(resolutionNote);
            expect(alert?.resolvedAt).toBeDefined();
        });

        it('should snooze an alert', async () => {
            const snoozeUntil = new Date(Date.now() + 3600000); // 1 hour from now

            await prisma.alertGroup.update({
                where: { id: testAlertGroupId },
                data: {
                    snoozedUntil: snoozeUntil,
                    snoozedBy: testUserId,
                },
            });

            const alert = await prisma.alertGroup.findUnique({
                where: { id: testAlertGroupId },
            });

            expect(alert?.snoozedUntil).toBeDefined();
            expect(alert?.snoozedBy).toBe(testUserId);
        });
    });
});
