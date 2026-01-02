import { PrismaClient, IntegrationStatus, IntegrationType, WorkspaceRole } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const workspace = await prisma.workspace.create({
        data: {
            name: 'SignalCraft Demo',
        },
    });
    await prisma.user.create({
        data: {
            workspaceId: workspace.id,
            clerkId: 'clerk_demo_user',
            email: 'demo@signalcraft.dev',
            displayName: 'Demo User',
            role: WorkspaceRole.OWNER,
        },
    });
    await prisma.integration.createMany({
        data: [
            {
                workspaceId: workspace.id,
                type: IntegrationType.SENTRY,
                status: IntegrationStatus.ACTIVE,
                configJson: { project: 'demo-project' },
            },
            {
                workspaceId: workspace.id,
                type: IntegrationType.SLACK,
                status: IntegrationStatus.ACTIVE,
                configJson: { channel: '#alerts-demo' },
            },
        ],
    });
}
main()
    .catch((error) => {
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
