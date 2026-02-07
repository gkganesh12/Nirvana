import { Injectable } from '@nestjs/common';
import { prisma } from '@signalcraft/database';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class WorkspacesService {
  private readonly prismaClient = prisma as any;

  constructor(private readonly auditService: AuditService) {}

  async getByClerkId(clerkId: string) {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { workspace: true },
    });

    return user?.workspace ?? null;
  }

  async getByWorkspaceId(workspaceId: string) {
    return prisma.workspace.findUnique({ where: { id: workspaceId } });
  }

  async getMembers(workspaceId: string) {
    return this.prismaClient.user.findMany({
      where: { workspaceId },
      select: {
        id: true,
        email: true,
        displayName: true,
        phoneNumber: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateMemberRole(
    workspaceId: string,
    userId: string,
    updates: { role?: any; phoneNumber?: string | null },
    actorId?: string,
  ) {
    const user = await this.prismaClient.user.update({
      where: { id: userId, workspaceId },
      data: {
        role: updates.role ?? undefined,
        phoneNumber: updates.phoneNumber ?? undefined,
      },
    });

    if (actorId) {
      await this.auditService.log({
        workspaceId,
        userId: actorId,
        action: 'UPDATE_MEMBER',
        resourceType: 'User',
        resourceId: userId,
        metadata: { role: updates.role, phoneNumber: updates.phoneNumber },
      });
    }

    return user;
  }

  async removeMember(workspaceId: string, userId: string, actorId?: string) {
    const user = await prisma.user.delete({
      where: { id: userId, workspaceId },
    });

    if (actorId) {
      await this.auditService.log({
        workspaceId,
        userId: actorId,
        action: 'REMOVE_MEMBER',
        resourceType: 'User',
        resourceId: userId,
        metadata: { email: user.email },
      });
    }

    return user;
  }
}
