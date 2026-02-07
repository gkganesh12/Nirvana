import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService, ResourceName, RESOURCES } from './permissions.service';
import { PermissionAction, prisma } from '@signalcraft/database';

export const PERMISSION_KEY = 'required_permission';

export interface RequiredPermission {
    resource: ResourceName;
    action: PermissionAction;
}

/**
 * Decorator to require specific permission for an endpoint
 * Usage: @RequirePermission(RESOURCES.ALERTS, 'WRITE')
 */
export const RequirePermission = (resource: ResourceName, action: PermissionAction) =>
    SetMetadata(PERMISSION_KEY, { resource, action } as RequiredPermission);

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private permissionsService: PermissionsService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermission = this.reflector.getAllAndOverride<RequiredPermission>(
            PERMISSION_KEY,
            [context.getHandler(), context.getClass()],
        );

        // If no permission metadata, allow access
        if (!requiredPermission) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        let user = request.dbUser;

        if (!user) {
            const clerkId = request.user?.clerkId;
            if (clerkId) {
                user = await prisma.user.findUnique({ where: { clerkId } });
                request.dbUser = user;
            }
        }

        const userId = user?.id;

        if (!userId) {
            throw new ForbiddenException('User session required for permission check');
        }

        const result = await this.permissionsService.checkPermission(
            userId,
            requiredPermission.resource,
            requiredPermission.action,
        );

        if (!result.allowed) {
            throw new ForbiddenException(result.reason || 'Permission denied');
        }

        return true;
    }
}

// Re-export for convenience
export { RESOURCES };
