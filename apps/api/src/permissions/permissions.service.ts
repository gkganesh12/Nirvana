import { Injectable, Logger } from '@nestjs/common';
import { prisma, WorkspaceRole, PermissionAction } from '@signalcraft/database';

// Define available resources
export const RESOURCES = {
    ALERTS: 'alerts',
    ROUTING: 'routing',
    INTEGRATIONS: 'integrations',
    SETTINGS: 'settings',
    USERS: 'users',
    API_KEYS: 'api-keys',
    AUDIT_LOGS: 'audit-logs',
    SSO: 'sso',
} as const;

export type ResourceName = (typeof RESOURCES)[keyof typeof RESOURCES];

// Default permissions for each role
const DEFAULT_PERMISSIONS: Record<WorkspaceRole, Record<ResourceName, PermissionAction[]>> = {
    OWNER: {
        [RESOURCES.ALERTS]: ['READ', 'WRITE', 'DELETE', 'MANAGE'],
        [RESOURCES.ROUTING]: ['READ', 'WRITE', 'DELETE', 'MANAGE'],
        [RESOURCES.INTEGRATIONS]: ['READ', 'WRITE', 'DELETE', 'MANAGE'],
        [RESOURCES.SETTINGS]: ['READ', 'WRITE', 'DELETE', 'MANAGE'],
        [RESOURCES.USERS]: ['READ', 'WRITE', 'DELETE', 'MANAGE'],
        [RESOURCES.API_KEYS]: ['READ', 'WRITE', 'DELETE', 'MANAGE'],
        [RESOURCES.AUDIT_LOGS]: ['READ', 'WRITE', 'DELETE', 'MANAGE'],
        [RESOURCES.SSO]: ['READ', 'WRITE', 'DELETE', 'MANAGE'],
    },
    ADMIN: {
        [RESOURCES.ALERTS]: ['READ', 'WRITE', 'DELETE', 'MANAGE'],
        [RESOURCES.ROUTING]: ['READ', 'WRITE', 'DELETE', 'MANAGE'],
        [RESOURCES.INTEGRATIONS]: ['READ', 'WRITE', 'DELETE'],
        [RESOURCES.SETTINGS]: ['READ', 'WRITE'],
        [RESOURCES.USERS]: ['READ', 'WRITE'],
        [RESOURCES.API_KEYS]: ['READ', 'WRITE', 'DELETE'],
        [RESOURCES.AUDIT_LOGS]: ['READ'],
        [RESOURCES.SSO]: ['READ'],
    },
    MEMBER: {
        [RESOURCES.ALERTS]: ['READ', 'WRITE'],
        [RESOURCES.ROUTING]: ['READ'],
        [RESOURCES.INTEGRATIONS]: ['READ'],
        [RESOURCES.SETTINGS]: ['READ'],
        [RESOURCES.USERS]: ['READ'],
        [RESOURCES.API_KEYS]: ['READ'],
        [RESOURCES.AUDIT_LOGS]: [],
        [RESOURCES.SSO]: [],
    },
};

export interface PermissionCheckResult {
    allowed: boolean;
    reason?: string;
}

@Injectable()
export class PermissionsService {
    private readonly logger = new Logger(PermissionsService.name);

    /**
     * Check if a user has permission to perform an action on a resource
     */
    async checkPermission(
        userId: string,
        resource: ResourceName,
        action: PermissionAction,
    ): Promise<PermissionCheckResult> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { workspaceId: true, role: true },
        });

        if (!user) {
            return { allowed: false, reason: 'User not found' };
        }

        // First check custom role permissions in database
        const customPermission = await this.getCustomPermission(user.workspaceId, user.role, resource);

        if (customPermission) {
            const allowed = customPermission.actions.includes(action);
            return {
                allowed,
                reason: allowed ? undefined : `Role ${user.role} does not have ${action} permission for ${resource}`
            };
        }

        // Fall back to default permissions
        const defaultActions = DEFAULT_PERMISSIONS[user.role]?.[resource] || [];
        const allowed = defaultActions.includes(action);

        return {
            allowed,
            reason: allowed ? undefined : `Role ${user.role} does not have ${action} permission for ${resource}`
        };
    }

    /**
     * Get custom permission from database
     */
    private async getCustomPermission(
        workspaceId: string,
        role: WorkspaceRole,
        resource: ResourceName,
    ) {
        // Find the permission definition
        const permission = await prisma.permission.findUnique({
            where: { name: resource },
        });

        if (!permission) {
            return null;
        }

        // Find the role permission
        return prisma.rolePermission.findUnique({
            where: {
                workspaceId_role_permissionId: {
                    workspaceId,
                    role,
                    permissionId: permission.id,
                },
            },
        });
    }

    /**
     * Get all permissions for a role in a workspace
     */
    async getPermissionsForRole(workspaceId: string, role: WorkspaceRole) {
        const customPermissions = await prisma.rolePermission.findMany({
            where: { workspaceId, role },
            include: { permission: true },
        });

        // Build permission map with defaults merged with custom
        const result: Record<ResourceName, PermissionAction[]> = { ...DEFAULT_PERMISSIONS[role] };

        for (const perm of customPermissions) {
            result[perm.permission.name as ResourceName] = perm.actions;
        }

        return result;
    }

    /**
     * Update permissions for a role
     */
    async updateRolePermissions(
        workspaceId: string,
        role: WorkspaceRole,
        permissions: Record<string, PermissionAction[]>,
    ) {
        const updates: Promise<unknown>[] = [];

        for (const [resourceName, actions] of Object.entries(permissions)) {
            // Ensure permission definition exists
            let permission = await prisma.permission.findUnique({
                where: { name: resourceName },
            });

            if (!permission) {
                permission = await prisma.permission.create({
                    data: { name: resourceName, description: `${resourceName} resource permissions` },
                });
            }

            // Upsert role permission
            updates.push(
                prisma.rolePermission.upsert({
                    where: {
                        workspaceId_role_permissionId: {
                            workspaceId,
                            role,
                            permissionId: permission.id,
                        },
                    },
                    create: {
                        workspaceId,
                        role,
                        permissionId: permission.id,
                        actions,
                    },
                    update: {
                        actions,
                    },
                }),
            );
        }

        await Promise.all(updates);
        this.logger.log(`Updated permissions for role ${role} in workspace ${workspaceId}`);

        return this.getPermissionsForRole(workspaceId, role);
    }

    /**
     * Initialize default permissions for a workspace
     */
    async initializeDefaultPermissions(workspaceId: string) {
        // Ensure all permission definitions exist
        for (const resourceName of Object.values(RESOURCES)) {
            await prisma.permission.upsert({
                where: { name: resourceName },
                create: { name: resourceName, description: `${resourceName} resource` },
                update: {},
            });
        }

        this.logger.log(`Initialized default permissions for workspace ${workspaceId}`);
    }

    /**
     * Get default permissions (for reference)
     */
    getDefaultPermissions() {
        return DEFAULT_PERMISSIONS;
    }
}
