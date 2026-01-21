import { PrismaClient } from '@signalcraft/database';

const prisma = new PrismaClient();

export async function seedTestData(workspaceId = 'workspace_test_123') {
    // 1. Ensure Workspace exists
    await prisma.workspace.upsert({
        where: { id: workspaceId },
        update: {},
        create: {
            id: workspaceId,
            name: 'Test Workspace',
        },
    });

    // 2. Create a Test User
    await prisma.user.upsert({
        where: { email: 'test@signalcraft.com' },
        update: {},
        create: {
            email: 'test@signalcraft.com',
            clerkId: 'user_test_123',
            workspaceId,
        },
    });

    // 3. Create initial Routing Rules
    await prisma.routingRule.upsert({
        where: { id: 'rule_test_123' },
        update: {},
        create: {
            id: 'rule_test_123',
            workspaceId,
            name: 'Default Critical Rule',
            conditionsJson: {
                all: [{ field: 'severity', operator: 'equals', value: 'critical' }]
            },
            actionsJson: {
                slackChannelId: 'C12345',
            },
            priority: 1,
            enabled: true,
        },
    });

    console.log('✅ Test data seeded');
}

export async function clearTestData(workspaceId = 'workspace_test_123') {
    await prisma.alertEvent.deleteMany({ where: { workspaceId } });
    await prisma.alertGroup.deleteMany({ where: { workspaceId } });
    await prisma.routingRule.deleteMany({ where: { workspaceId } });
    // Keep workspace and user to avoid constant recreation
    console.log('🧹 Test data cleared');
}
