import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@signalcraft/database';

@Injectable()
export class AlertPoliciesService {
  async listPolicies(workspaceId: string) {
    const prismaClient = prisma as any;
    const policies = await prismaClient.alertPolicy.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });

    return policies.map((policy: any) => ({
      id: policy.id,
      name: policy.name,
      externalId: policy.externalId,
      severity: policy.severity,
      routingKey: policy.routingKey,
      conditions: policy.conditionsJson,
      createdBy: policy.createdBy,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
    }));
  }

  async getPolicy(workspaceId: string, policyId: string) {
    const prismaClient = prisma as any;
    const policy = await prismaClient.alertPolicy.findFirst({
      where: { id: policyId, workspaceId },
    });

    if (!policy) {
      throw new NotFoundException('Alert policy not found');
    }

    return {
      id: policy.id,
      name: policy.name,
      externalId: policy.externalId,
      severity: policy.severity,
      routingKey: policy.routingKey,
      conditions: policy.conditionsJson,
      createdBy: policy.createdBy,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
    };
  }

  async createPolicy(
    workspaceId: string,
    actorId: string,
    data: {
      name: string;
      externalId?: string;
      severity: string;
      routingKey: string;
      conditions: any[];
    },
  ) {
    const prismaClient = prisma as any;
    return prismaClient.alertPolicy.create({
      data: {
        workspaceId,
        name: data.name,
        externalId: data.externalId ?? null,
        severity: data.severity,
        routingKey: data.routingKey,
        conditionsJson: data.conditions,
        createdBy: actorId,
      },
    });
  }

  async updatePolicy(
    workspaceId: string,
    policyId: string,
    data: {
      name?: string;
      severity?: string;
      routingKey?: string;
      conditions?: any[];
    },
  ) {
    const prismaClient = prisma as any;
    const existing = await prismaClient.alertPolicy.findFirst({
      where: { id: policyId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('Alert policy not found');
    }

    return prismaClient.alertPolicy.update({
      where: { id: policyId },
      data: {
        name: data.name ?? undefined,
        severity: data.severity ?? undefined,
        routingKey: data.routingKey ?? undefined,
        conditionsJson: data.conditions ?? undefined,
      },
    });
  }

  async deletePolicy(workspaceId: string, policyId: string) {
    const prismaClient = prisma as any;
    const existing = await prismaClient.alertPolicy.findFirst({
      where: { id: policyId, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('Alert policy not found');
    }

    await prismaClient.alertPolicy.delete({ where: { id: policyId } });
    return { success: true };
  }

  async deletePolicyByExternalId(workspaceId: string, externalId: string) {
    const prismaClient = prisma as any;
    const existing = await prismaClient.alertPolicy.findFirst({
      where: { workspaceId, externalId },
    });

    if (!existing) {
      throw new NotFoundException('Alert policy not found');
    }

    await prismaClient.alertPolicy.delete({ where: { id: existing.id } });
    return { success: true };
  }

  async upsertPolicy(
    workspaceId: string,
    actorId: string,
    data: {
      name: string;
      externalId?: string;
      severity: string;
      routingKey: string;
      conditions: any[];
    },
  ) {
    const prismaClient = prisma as any;

    if (!data.externalId && !data.name) {
      throw new BadRequestException('externalId or name is required');
    }

    const existing = await prismaClient.alertPolicy.findFirst({
      where: {
        workspaceId,
        ...(data.externalId ? { externalId: data.externalId } : { name: data.name }),
      },
    });

    if (existing) {
      return prismaClient.alertPolicy.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          severity: data.severity,
          routingKey: data.routingKey,
          conditionsJson: data.conditions,
        },
      });
    }

    return this.createPolicy(workspaceId, actorId, data);
  }
}
