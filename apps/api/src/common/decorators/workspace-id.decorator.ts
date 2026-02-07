/**
 * WorkspaceId Decorator
 *
 * Extracts workspace ID from the authenticated user's context.
 * Uses the user's primary workspace for now.
 *
 * @module common/decorators/workspace-id.decorator
 */
import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { prisma } from '@signalcraft/database';

export const WorkspaceId = createParamDecorator(
  async (_data: unknown, ctx: ExecutionContext): Promise<string> => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (request.workspaceId) {
      return request.workspaceId as string;
    }

    if (user?.workspaceId) {
      return user.workspaceId as string;
    }

    if (!user?.clerkUserId && !user?.clerkId) {
      console.error('WorkspaceId Decorator: User not authenticated in request', user);
      throw new UnauthorizedException('User not authenticated');
    }

    const clerkId = user.clerkUserId || user.clerkId;

    // Get user from database with workspace using clerkId
    const dbUser = await prisma.user.findUnique({
      where: { clerkId },
      include: { workspace: true },
    });

    if (!dbUser?.workspaceId) {
      throw new UnauthorizedException('User has no workspace');
    }

    return dbUser.workspaceId;
  },
);
