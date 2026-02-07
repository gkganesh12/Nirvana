/**
 * UserId Decorator
 *
 * Extracts the Clerk user ID from the authenticated request.
 *
 * @module common/decorators/user-id.decorator
 */
import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { prisma } from '@signalcraft/database';

export const UserId = createParamDecorator(
  async (_data: unknown, ctx: ExecutionContext): Promise<string> => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.clerkUserId && !user?.clerkId) {
      throw new UnauthorizedException('User not authenticated');
    }

    const clerkId = user.clerkUserId || user.clerkId;
    const dbUser = await prisma.user.findUnique({ where: { clerkId } });

    if (!dbUser) {
      throw new UnauthorizedException('User not found');
    }

    return dbUser.id;
  },
);
