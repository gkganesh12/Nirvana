import { Injectable } from '@nestjs/common';
import { prisma } from '@signalcraft/database';

@Injectable()
export class UsersService {
  async listByWorkspace(workspaceId: string) {
    return prisma.user.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listByClerkId(clerkId: string) {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return [];
    }
    return this.listByWorkspace(user.workspaceId);
  }
}
