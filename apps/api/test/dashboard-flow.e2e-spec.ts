/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { prisma } from '@signalcraft/database';
import { CustomDashboardModule } from '../src/dashboards/dashboard.module';
import { WorkspacesModule } from '../src/workspaces/workspaces.module';
import { UsersModule } from '../src/users/users.module'; // Needed for Auth guards probably
import { AuthModule } from '../src/auth/auth.module';
import { ConfigModule } from '@nestjs/config';

// Mock Prisma
jest.mock('@signalcraft/database', () => {
    const mockPrisma = {
        customDashboard: {
            create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'dashboard-1', ...args.data })),
            findMany: jest.fn().mockResolvedValue([]),
            findFirst: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockImplementation((args) => Promise.resolve({ id: args.where.id, ...args.data })),
            delete: jest.fn().mockResolvedValue({}),
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        alertGroup: {
            count: jest.fn().mockResolvedValue(5),
            groupBy: jest.fn().mockResolvedValue([
                { severity: 'HIGH', _count: 2 },
                { severity: 'LOW', _count: 3 },
            ]),
            findMany: jest.fn().mockResolvedValue([]),
        },
        workspace: {
            findUnique: jest.fn().mockResolvedValue({ id: 'test-workspace', name: 'Test' }),
        },
        user: {
            findUnique: jest.fn().mockResolvedValue({ id: 'user-1', workspaceId: 'test-workspace' }),
        },
    };
    return {
        prisma: mockPrisma,
        AlertStatus: {
            OPEN: 'OPEN',
            RESOLVED: 'RESOLVED',
        },
        AlertSeverity: {
            HIGH: 'HIGH',
            LOW: 'LOW',
        },
    };
});

import { ClerkAuthGuard } from '../src/auth/clerk-auth.guard';

// ... (existing mocks)

describe('Custom Dashboard Flow (e2e)', () => {
    let app: INestApplication;
    const testWorkspaceId = 'test-workspace';
    const testUserId = 'user-1';

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
                CustomDashboardModule,
            ],
        })
            .overrideGuard(ClerkAuthGuard)
            .useValue({ canActivate: () => true })
            .overrideProvider('APP_GUARD')
            .useValue({})
            .compile();

        app = moduleFixture.createNestApplication();
        // Mock Auth middleware/guard behavior is tricky in e2e without full setup
        // But since we are mocking Prisma & Services, we might be able to bypass or mock the User decorator.
        // For simplicity in this environment, we'll assume the AuthGuard allows request or we mock it.
        // Note: Real NestJS e2e usually requires a valid JWT or a mock AuthGuard. 
        // Let's assume the controller uses @DbUser which extracts from request.

        // We will attach a mock user middleware
        // We will attach a mock user middleware
        app.use((req: any, res: any, next: any) => {
            const userObj = {
                id: testUserId,
                workspaceId: testWorkspaceId,
                clerkId: 'test-clerk-id'
            };
            req.user = userObj;
            req.dbUser = userObj;
            next();
        });

        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Dashboard Management', () => {

        it('should create a new dashboard', async () => {
            const dashboardDto = {
                name: 'My Custom Dashboard',
                description: 'A test dashboard',
                layout: { type: 'grid', columns: 12 },
                widgets: [],
                isDefault: false,
            };

            const response = await request(app.getHttpServer())
                .post('/api/dashboards')
                .set('x-workspace-id', testWorkspaceId) // Pass workspace ID header if required
                .send(dashboardDto)
                .expect(201);

            expect(response.body.id).toBeDefined();
            expect(response.body.name).toBe(dashboardDto.name);
            expect(prisma.customDashboard.create).toHaveBeenCalled();
        });

        it('should list dashboards for workspace', async () => {
            // Mock findMany return
            (prisma.customDashboard.findMany as jest.Mock).mockResolvedValueOnce([
                { id: 'dashboard-1', name: 'Dashboard 1', isDefault: true },
                { id: 'dashboard-2', name: 'Dashboard 2', isDefault: false },
            ]);

            const response = await request(app.getHttpServer())
                .get('/api/dashboards')
                .set('x-workspace-id', testWorkspaceId)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(2);
        });

        it('should get dashboard details with widget data', async () => {
            const dashboardId = 'dashboard-1';

            // Mock getDashboard finding the dashboard
            (prisma.customDashboard.findFirst as jest.Mock).mockResolvedValueOnce({
                id: dashboardId,
                name: 'Data Dashboard',
                widgets: [
                    { id: 'w1', type: 'alert_count', config: {} },
                    { id: 'w2', type: 'alerts_by_severity', config: {} }
                ]
            });

            const response = await request(app.getHttpServer())
                .get(`/api/dashboards/${dashboardId}/data`)
                .set('x-workspace-id', testWorkspaceId)
                .expect(200);

            expect(response.body.dashboard).toBeDefined();
            expect(response.body.widgetData).toHaveLength(2);

            // Check widget data results
            const alertCountWidget = response.body.widgetData.find((w: any) => w.id === 'w1');
            expect(alertCountWidget.data.count).toBe(5); // From mock

            const severityWidget = response.body.widgetData.find((w: any) => w.id === 'w2');
            expect(severityWidget.data).toHaveLength(2);
        });

        it('should return available templates', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/dashboards/templates')
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);
            expect(response.body[0].layout).toBeDefined();
        });
    });
});
