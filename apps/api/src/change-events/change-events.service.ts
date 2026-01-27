import { Injectable } from '@nestjs/common';
import { Prisma, prisma } from '@signalcraft/database';

export interface CreateChangeEventDto {
  type: string;
  source: string;
  title?: string;
  project?: string;
  environment?: string;
  actor?: string;
  details?: Record<string, unknown>;
  timestamp?: string | Date;
}

@Injectable()
export class ChangeEventsService {
  async createChangeEvent(workspaceId: string, dto: CreateChangeEventDto) {
    const timestamp = dto.timestamp ? new Date(dto.timestamp) : new Date();
    return prisma.changeEvent.create({
      data: {
        workspaceId,
        type: dto.type,
        source: dto.source,
        title: dto.title ?? null,
        project: dto.project ?? null,
        environment: dto.environment ?? null,
        actor: dto.actor ?? null,
        details: (dto.details ?? undefined) as Prisma.InputJsonValue | undefined,
        timestamp,
      },
    });
  }

  async listChangeEvents(
    workspaceId: string,
    filters: {
      project?: string;
      environment?: string;
      since?: Date;
      until?: Date;
      limit?: number;
    } = {},
  ) {
    const where: Prisma.ChangeEventWhereInput = { workspaceId };

    if (filters.project) {
      where.project = filters.project;
    }

    if (filters.environment) {
      where.environment = filters.environment;
    }

    if (filters.since || filters.until) {
      where.timestamp = {
        ...(filters.since ? { gte: filters.since } : {}),
        ...(filters.until ? { lte: filters.until } : {}),
      };
    }

    return prisma.changeEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: Math.min(filters.limit ?? 50, 200),
    });
  }

  async getChangeEventsForAlertGroup(
    workspaceId: string,
    alertGroupId: string,
    windowMinutes = 120,
  ) {
    const group = await prisma.alertGroup.findFirst({
      where: { id: alertGroupId, workspaceId },
      select: { firstSeenAt: true, lastSeenAt: true, project: true, environment: true },
    });

    if (!group) return null;

    const bufferMs = windowMinutes * 60 * 1000;
    const since = new Date(group.firstSeenAt.getTime() - bufferMs);
    const until = new Date(group.lastSeenAt.getTime() + bufferMs);

    const where: Prisma.ChangeEventWhereInput = {
      workspaceId,
      timestamp: { gte: since, lte: until },
      AND: [
        {
          OR: [{ project: group.project }, { project: null }],
        },
        {
          OR: [{ environment: group.environment }, { environment: null }],
        },
      ],
    };

    return prisma.changeEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    });
  }
}
