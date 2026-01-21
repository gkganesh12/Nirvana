import { Injectable } from '@nestjs/common';
import { prisma } from '@signalcraft/database';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class WorkspacesService {
  constructor(private readonly auditService: AuditService) { }

  async getByClerkId(clerkId: string) {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { workspace: true },
    });

    return user?.workspace ?? null;
  }

  async getMembers(workspaceId: string) {
    return prisma.user.findMany({
      where: { workspaceId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateMemberRole(workspaceId: string, userId: string, role: any, actorId?: string) {
    const user = await prisma.user.update({
      where: { id: userId, workspaceId },
      data: { role },
    });

    if (actorId) {
      await this.auditService.log({
        workspaceId,
        userId: actorId,
        action: 'UPDATE_MEMBER_ROLE',
        resourceType: 'User',
        resourceId: userId,
        metadata: { role },
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
