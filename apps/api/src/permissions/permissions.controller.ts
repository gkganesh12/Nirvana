import {
    Controller,
    Get,
    Put,
    Body,
    Param,
    Req,
    UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { PermissionsService, RESOURCES, ResourceName } from './permissions.service';
import { RequirePermission, PermissionsGuard } from './permissions.guard';
import { WorkspaceRole, PermissionAction } from '@signalcraft/database';

interface AuthenticatedRequest extends Request {
    auth?: {
        userId?: string;
        workspaceId?: string;
    };
}

interface UpdatePermissionsDto {
    permissions: Record<string, PermissionAction[]>;
}

@Controller('api/permissions')
@UseGuards(ClerkAuthGuard)
export class PermissionsController {
    constructor(private readonly permissionsService: PermissionsService) { }

    /**
     * Get available resources and actions
     */
    @Get('resources')
    getResources() {
        return {
            resources: Object.values(RESOURCES),
            actions: ['READ', 'WRITE', 'DELETE', 'MANAGE'] as PermissionAction[],
        };
    }

    /**
     * Get default permissions for all roles
     */
    @Get('defaults')
    getDefaultPermissions() {
        return this.permissionsService.getDefaultPermissions();
    }

    /**
     * Get permissions for a specific role in the workspace
     */
    @Get('role/:role')
    @UseGuards(PermissionsGuard)
    @RequirePermission(RESOURCES.SETTINGS, 'READ')
    async getRolePermissions(
        @Req() req: AuthenticatedRequest,
        @Param('role') role: WorkspaceRole,
    ) {
        const workspaceId = req.auth?.workspaceId;
        if (!workspaceId) {
            return { error: 'Workspace not found', status: 404 };
        }

        return this.permissionsService.getPermissionsForRole(workspaceId, role);
    }

    /**
     * Update permissions for a role
     */
    @Put('role/:role')
    @UseGuards(PermissionsGuard)
    @RequirePermission(RESOURCES.SETTINGS, 'MANAGE')
    async updateRolePermissions(
        @Req() req: AuthenticatedRequest,
        @Param('role') role: WorkspaceRole,
        @Body() body: UpdatePermissionsDto,
    ) {
        const workspaceId = req.auth?.workspaceId;
        if (!workspaceId) {
            return { error: 'Workspace not found', status: 404 };
        }

        // Prevent modifying OWNER permissions to avoid lockout
        if (role === 'OWNER') {
            return { error: 'Cannot modify OWNER permissions', status: 403 };
        }

        const updated = await this.permissionsService.updateRolePermissions(
            workspaceId,
            role,
            body.permissions,
        );

        return { success: true, permissions: updated };
    }

    /**
     * Check if current user has a specific permission
     */
    @Get('check/:resource/:action')
    async checkPermission(
        @Req() req: AuthenticatedRequest,
        @Param('resource') resource: ResourceName,
        @Param('action') action: PermissionAction,
    ) {
        const userId = req.auth?.userId;
        if (!userId) {
            return { allowed: false, reason: 'Not authenticated' };
        }

        return this.permissionsService.checkPermission(userId, resource, action);
    }
}
