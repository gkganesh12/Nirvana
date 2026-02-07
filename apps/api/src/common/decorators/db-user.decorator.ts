import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { prisma } from '@signalcraft/database';

export const DbUser = createParamDecorator(async (_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const prismaClient = prisma as any;

  if (request.dbUser) {
    return request.dbUser;
  }

  const user = request.user;
  if (user?.clerkId || user?.clerkUserId) {
    const clerkId = user.clerkId || user.clerkUserId;
    const dbUser = await prisma.user.findUnique({ where: { clerkId } });
    if (dbUser) {
      request.dbUser = dbUser;
      return dbUser;
    }
  }

  if (user?.serviceAccountId) {
    const serviceAccount = await prismaClient.serviceAccount.findUnique({
      where: { id: user.serviceAccountId },
      select: { createdBy: true },
    });
    if (serviceAccount?.createdBy) {
      const dbUser = await prisma.user.findUnique({ where: { id: serviceAccount.createdBy } });
      if (dbUser) {
        request.dbUser = dbUser;
        return dbUser;
      }
    }
  }

  return null;
});
