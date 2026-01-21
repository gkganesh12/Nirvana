import { PrismaClient } from '@signalcraft/database';

// Mock Prisma globally
jest.mock('@signalcraft/database', () => {
    return {
        PrismaClient: jest.fn().mockImplementation(() => ({
            alertEvent: {
                create: jest.fn(),
                findMany: jest.fn(),
                findUnique: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
                count: jest.fn(),
            },
            alertGroup: {
                create: jest.fn(),
                findMany: jest.fn(),
                findUnique: jest.fn(),
                update: jest.fn(),
                upsert: jest.fn(),
                count: jest.fn(),
            },
            workspace: {
                findUnique: jest.fn(),
                findFirst: jest.fn(),
            },
            user: {
                findUnique: jest.fn(),
                findFirst: jest.fn(),
            },
            routingRule: {
                findMany: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
            },
            notificationLog: {
                create: jest.fn(),
                findMany: jest.fn(),
            },
        })),
    };
});

// Global test utilities
(global as any).createMockUser = () => ({
    id: 'user_123',
    email: 'test@example.com',
    workspaceId: 'workspace_123',
    role: 'ADMIN',
});

(global as any).createMockAlertEvent = (overrides = {}) => ({
    id: 'alert_123',
    workspaceId: 'workspace_123',
    source: 'SENTRY',
    sourceEventId: 'event_123',
    project: 'api',
    environment: 'production',
    severity: 'HIGH',
    fingerprint: 'error-hash-123',
    title: 'TypeError in handler',
    message: 'Cannot read property "foo" of undefined',
    occurredAt: new Date(),
    receivedAt: new Date(),
    tagsJson: {},
    payloadJson: {},
    ...overrides,
});
