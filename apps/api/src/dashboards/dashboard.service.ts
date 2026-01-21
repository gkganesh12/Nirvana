import { Injectable } from '@nestjs/common';
import { prisma, AlertStatus, AlertSeverity } from '@signalcraft/database';
import { CreateDashboardDto, UpdateDashboardDto } from './dto/dashboard.dto';
import { DASHBOARD_TEMPLATES } from './dashboard.templates';

@Injectable()
export class DashboardService {
    getTemplates() {
        return Object.values(DASHBOARD_TEMPLATES);
    }

    async createDashboard(workspaceId: string, userId: string, dto: CreateDashboardDto) {
        // If setting as default, unset other defaults
        if (dto.isDefault) {
            await prisma.customDashboard.updateMany({
                where: { workspaceId, isDefault: true },
                data: { isDefault: false },
            });
        }

        return prisma.customDashboard.create({
            data: {
                workspaceId,
                createdBy: userId,
                name: dto.name,
                description: dto.description,
                layout: dto.layout as any,
                widgets: dto.widgets as any,
                isDefault: dto.isDefault ?? false,
            },
        });
    }

    async listDashboards(workspaceId: string) {
        return prisma.customDashboard.findMany({
            where: { workspaceId },
            orderBy: [
                { isDefault: 'desc' },
                { createdAt: 'desc' },
            ],
            include: {
                creator: {
                    select: {
                        id: true,
                        email: true,
                        displayName: true,
                    },
                },
            },
        });
    }

    async getDashboard(id: string, workspaceId: string) {
        return prisma.customDashboard.findFirst({
            where: { id, workspaceId },
            include: {
                creator: {
                    select: {
                        id: true,
                        email: true,
                        displayName: true,
                    },
                },
            },
        });
    }

    async updateDashboard(id: string, workspaceId: string, dto: UpdateDashboardDto) {
        // If setting as default, unset other defaults
        if (dto.isDefault) {
            await prisma.customDashboard.updateMany({
                where: { workspaceId, isDefault: true, id: { not: id } },
                data: { isDefault: false },
            });
        }

        return prisma.customDashboard.update({
            where: { id, workspaceId },
            data: {
                name: dto.name,
                description: dto.description,
                layout: dto.layout as any,
                widgets: dto.widgets as any,
                isDefault: dto.isDefault,
            },
        });
    }

    async deleteDashboard(id: string, workspaceId: string) {
        return prisma.customDashboard.delete({
            where: { id, workspaceId },
        });
    }

    async getDashboardData(id: string, workspaceId: string) {
        const dashboard = await this.getDashboard(id, workspaceId);
        if (!dashboard) {
            throw new Error('Dashboard not found');
        }

        const widgets = dashboard.widgets as any[];
        const widgetData = await Promise.all(
            widgets.map(async (widget) => ({
                id: widget.id,
                data: await this.getWidgetData(widget, workspaceId),
            }))
        );

        return {
            dashboard,
            widgetData,
        };
    }

    private async getWidgetData(widget: any, workspaceId: string): Promise<any> {
        switch (widget.type) {
            case 'alert_count':
                return this.getAlertCountData(workspaceId, widget.config);
            case 'alerts_by_severity':
                return this.getAlertsBySeverityData(workspaceId, widget.config);
            case 'recent_alerts':
                return this.getRecentAlertsData(workspaceId, widget.config);
            case 'alert_timeline':
                return this.getAlertTimelineData(workspaceId, widget.config);
            default:
                return { error: 'Unknown widget type' };
        }
    }

    private async getAlertCountData(workspaceId: string, config: any) {
        const count = await prisma.alertGroup.count({
            where: {
                workspaceId,
                status: config?.status || AlertStatus.OPEN,
            },
        });

        return { count };
    }

    private async getAlertsBySeverityData(workspaceId: string, config: any) {
        const alerts = await prisma.alertGroup.groupBy({
            by: ['severity'],
            where: {
                workspaceId,
                status: config?.status || AlertStatus.OPEN,
            },
            _count: true,
        });

        return alerts.map((item: any) => ({
            severity: item.severity,
            count: item._count,
        }));
    }

    private async getRecentAlertsData(workspaceId: string, config: any) {
        const limit = config?.limit || 10;

        return prisma.alertGroup.findMany({
            where: {
                workspaceId,
                status: config?.status,
            },
            orderBy: { lastSeenAt: 'desc' },
            take: limit,
            select: {
                id: true,
                title: true,
                severity: true,
                environment: true,
                status: true,
                lastSeenAt: true,
            },
        });
    }

    private async getAlertTimelineData(workspaceId: string, config: any) {
        const hoursBack = config?.hoursBack || 24;
        const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

        const alerts = await prisma.alertGroup.findMany({
            where: {
                workspaceId,
                firstSeenAt: { gte: startTime },
            },
            select: {
                firstSeenAt: true,
                severity: true,
            },
        });

        // Group by hour
        const timeline: Record<string, Record<string, number>> = {};

        alerts.forEach((alert: any) => {
            const hour = new Date(alert.firstSeenAt).toISOString().slice(0, 13) + ':00:00';
            if (!timeline[hour]) {
                timeline[hour] = {};
            }
            timeline[hour][alert.severity] = (timeline[hour][alert.severity] || 0) + 1;
        });

        return Object.entries(timeline).map(([timestamp, severities]) => ({
            timestamp,
            ...severities,
        }));
    }
}
