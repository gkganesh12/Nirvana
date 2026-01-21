/**
 * UserId Decorator
 * 
 * Extracts the Clerk user ID from the authenticated request.
 * 
 * @module common/decorators/user-id.decorator
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const UserId = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): string | null => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user;
        return user?.clerkUserId ?? null;
    },
);
