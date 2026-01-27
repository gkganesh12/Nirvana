import { Injectable } from '@nestjs/common';
import { IntegrationType, prisma } from '@signalcraft/database';

@Injectable()
export class ExternalMappingsService {
  async upsertMapping(params: {
    alertGroupId: string;
    integrationType: IntegrationType;
    externalId: string;
    metadata?: Record<string, unknown>;
  }) {
    const prismaClient = prisma as any;
    return prismaClient.externalMapping.upsert({
      where: {
        alertGroupId_integrationType: {
          alertGroupId: params.alertGroupId,
          integrationType: params.integrationType,
        },
      },
      create: {
        alertGroupId: params.alertGroupId,
        integrationType: params.integrationType,
        externalId: params.externalId,
        metadata: params.metadata ?? {},
      },
      update: {
        externalId: params.externalId,
        metadata: params.metadata ?? {},
      },
    });
  }

  async findByExternalId(params: { integrationType: IntegrationType; externalId: string }) {
    const prismaClient = prisma as any;
    return prismaClient.externalMapping.findFirst({
      where: {
        integrationType: params.integrationType,
        externalId: params.externalId,
      },
      include: {
        alertGroup: true,
      },
    });
  }

  async listByAlertGroup(alertGroupId: string) {
    const prismaClient = prisma as any;
    return prismaClient.externalMapping.findMany({
      where: { alertGroupId },
      select: {
        integrationType: true,
        externalId: true,
      },
    }) as Array<{ integrationType: IntegrationType; externalId: string }>;
  }
}
