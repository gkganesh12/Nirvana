import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiOrClerkAuthGuard } from '../auth/api-or-clerk-auth.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { prisma, NotificationStatus } from '@signalcraft/database';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(ApiOrClerkAuthGuard)
@Controller('notifications')
export class NotificationsController {
  @Get('health')
  async health(@WorkspaceId() workspaceId: string) {
    const [lastSuccess, lastFailure] = await Promise.all([
      prisma.notificationLog.findFirst({
        where: { workspaceId, status: 'SENT' },
        orderBy: { sentAt: 'desc' },
      }),
      prisma.notificationLog.findFirst({
        where: { workspaceId, status: 'FAILED' },
        orderBy: { sentAt: 'desc' },
      }),
    ]);

    return {
      lastSuccessAt: lastSuccess?.sentAt ?? null,
      lastFailureAt: lastFailure?.sentAt ?? null,
    };
  }

  @Get('logs')
  async logs(@WorkspaceId() workspaceId: string, @Query('status') status?: string) {
    return prisma.notificationLog.findMany({
      where: {
        workspaceId,
        status: this.normalizeStatus(status),
      },
      orderBy: { sentAt: 'desc' },
      take: 50,
    });
  }

  private normalizeStatus(status?: string): NotificationStatus | undefined {
    if (!status) {
      return undefined;
    }
    const value = status.toUpperCase();
    if (Object.values(NotificationStatus).includes(value as NotificationStatus)) {
      return value as NotificationStatus;
    }
    return undefined;
  }
}
