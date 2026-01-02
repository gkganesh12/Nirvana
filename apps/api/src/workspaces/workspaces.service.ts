import { Injectable } from '@nestjs/common';
import { prisma } from '@signalcraft/database';

@Injectable()
export class WorkspacesService {
  async getByClerkId(clerkId: string) {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { workspace: true },
    });

    return user?.workspace ?? null;
  }
}
