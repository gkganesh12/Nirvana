import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { WorkspaceRole } from '@signalcraft/shared';
import { prisma } from '@signalcraft/database';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<WorkspaceRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const prismaClient = prisma as any;

    let user = request.dbUser as any;

    if (!user) {
      const clerkId = request.user?.clerkId as string | undefined;
      if (clerkId) {
        user = await prisma.user.findUnique({ where: { clerkId } });
      } else if (request.user?.serviceAccountId) {
        const serviceAccount = await prismaClient.serviceAccount.findUnique({
          where: { id: request.user.serviceAccountId },
          select: { createdBy: true },
        });
        if (serviceAccount?.createdBy) {
          user = await prisma.user.findUnique({ where: { id: serviceAccount.createdBy } });
        }
      }
    }

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    request.dbUser = user;

    if (!requiredRoles.includes(user.role as WorkspaceRole)) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}
