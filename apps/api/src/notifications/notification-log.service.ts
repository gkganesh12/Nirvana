import { Injectable } from '@nestjs/common';
import { prisma, NotificationStatus, NotificationTarget } from '@signalcraft/database';

@Injectable()
export class NotificationLogService {
  async findLatestTargetRef(workspaceId: string, alertGroupId: string, target: NotificationTarget) {
    const log = await prisma.notificationLog.findFirst({
      where: { workspaceId, alertGroupId, target, status: NotificationStatus.SENT },
      orderBy: { sentAt: 'desc' },
      select: { targetRef: true },
    });

    return log?.targetRef ?? null;
  }

  async logSuccess(
    workspaceId: string,
    targetRef: string,
    alertGroupId: string,
    target: NotificationTarget = NotificationTarget.SLACK,
  ) {
    return prisma.notificationLog.create({
      data: {
        workspaceId,
        target,
        targetRef,
        alertGroupId,
        status: NotificationStatus.SENT,
      },
    });
  }

  async logFailure(
    workspaceId: string,
    targetRef: string,
    alertGroupId: string,
    errorMessage: string,
    target: NotificationTarget = NotificationTarget.SLACK,
  ) {
    return prisma.notificationLog.create({
      data: {
        workspaceId,
        target,
        targetRef,
        alertGroupId,
        status: NotificationStatus.FAILED,
        errorMessage,
      },
    });
  }
}
