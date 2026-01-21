import { Injectable, Logger } from '@nestjs/common';
import { prisma, IntegrationType, IntegrationStatus, Prisma } from '@signalcraft/database';

@Injectable()
export class IntegrationsService {
    private readonly logger = new Logger(IntegrationsService.name);

    /**
     * Get integration by type for a workspace
     */
    async getIntegration(workspaceId: string, type: IntegrationType) {
        return prisma.integration.findFirst({
            where: { workspaceId, type },
        });
    }

    /**
     * Check if an integration is active
     */
    async isIntegrationActive(workspaceId: string, type: IntegrationType): Promise<boolean> {
        const integration = await prisma.integration.findFirst({
            where: { workspaceId, type, status: IntegrationStatus.ACTIVE },
        });
        return !!integration;
    }

    /**
     * List all integrations for a workspace
     */
    async listIntegrations(workspaceId: string) {
        return prisma.integration.findMany({
            where: { workspaceId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Update integration status
     */
    async updateIntegrationStatus(
        workspaceId: string,
        type: IntegrationType,
        status: IntegrationStatus,
    ) {
        return prisma.integration.updateMany({
            where: { workspaceId, type },
            data: { status },
        });
    }

    /**
     * Delete integration
     */
    async deleteIntegration(workspaceId: string, type: IntegrationType) {
        return prisma.integration.deleteMany({
            where: { workspaceId, type },
        });
    }

    /**
     * Create or update integration config
     */
    async upsertIntegration(
        workspaceId: string,
        type: IntegrationType,
        configJson: Prisma.InputJsonValue,
    ) {
        return prisma.integration.upsert({
            where: { workspaceId_type: { workspaceId, type } },
            update: { configJson, status: IntegrationStatus.ACTIVE },
            create: { workspaceId, type, configJson, status: IntegrationStatus.ACTIVE },
        });
    }
}
