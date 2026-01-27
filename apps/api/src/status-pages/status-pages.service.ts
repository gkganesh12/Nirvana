import { Injectable } from '@nestjs/common';
import {
  prisma,
  StatusIncidentStatus,
  StatusIncidentImpact,
  StatusPageVisibility,
} from '@signalcraft/database';
import crypto from 'crypto';
import { EmailNotificationService } from '../notifications/email-notification.service';

interface CreateStatusPageDto {
  slug: string;
  title: string;
  description?: string;
  visibility?: StatusPageVisibility;
}

interface UpdateStatusPageDto {
  title?: string;
  description?: string;
  visibility?: StatusPageVisibility;
  isActive?: boolean;
}

interface CreateIncidentDto {
  title: string;
  status: StatusIncidentStatus;
  impact?: StatusIncidentImpact;
  message?: string;
  alertGroupId?: string;
}

interface UpdateIncidentDto {
  status?: StatusIncidentStatus;
  impact?: StatusIncidentImpact;
  message?: string;
}

@Injectable()
export class StatusPagesService {
  constructor(private readonly emailService: EmailNotificationService) {}

  async listStatusPages(workspaceId: string) {
    return prisma.statusPage.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStatusPage(workspaceId: string, dto: CreateStatusPageDto) {
    const slug = this.normalizeSlug(dto.slug);
    return prisma.statusPage.create({
      data: {
        workspaceId,
        slug,
        title: dto.title,
        description: dto.description,
        visibility: dto.visibility ?? StatusPageVisibility.PUBLIC,
      },
    });
  }

  async updateStatusPage(workspaceId: string, id: string, dto: UpdateStatusPageDto) {
    const page = await prisma.statusPage.findFirst({ where: { id, workspaceId } });
    if (!page) {
      return null;
    }
    return prisma.statusPage.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.visibility !== undefined && { visibility: dto.visibility }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async getPublicStatusPage(slug: string) {
    return prisma.statusPage.findFirst({
      where: { slug, isActive: true, visibility: StatusPageVisibility.PUBLIC },
      include: {
        incidents: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
  }

  async listIncidents(workspaceId: string, statusPageId: string) {
    return prisma.statusPageIncident.findMany({
      where: { statusPageId, statusPage: { workspaceId } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createIncident(workspaceId: string, statusPageId: string, dto: CreateIncidentDto) {
    const page = await prisma.statusPage.findFirst({ where: { id: statusPageId, workspaceId } });
    if (!page) {
      return null;
    }

    const incident = await prisma.statusPageIncident.create({
      data: {
        statusPageId,
        alertGroupId: dto.alertGroupId,
        title: dto.title,
        status: dto.status,
        impact: dto.impact ?? StatusIncidentImpact.MINOR,
        message: dto.message,
        resolvedAt: dto.status === StatusIncidentStatus.RESOLVED ? new Date() : null,
      },
    });

    await this.notifySubscribers(workspaceId, statusPageId, incident);

    return incident;
  }

  async updateIncident(
    workspaceId: string,
    statusPageId: string,
    incidentId: string,
    dto: UpdateIncidentDto,
  ) {
    const incident = await prisma.statusPageIncident.findFirst({
      where: { id: incidentId, statusPageId, statusPage: { workspaceId } },
    });
    if (!incident) {
      return null;
    }

    const updated = await prisma.statusPageIncident.update({
      where: { id: incidentId },
      data: {
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.impact !== undefined && { impact: dto.impact }),
        ...(dto.message !== undefined && { message: dto.message }),
        ...(dto.status === StatusIncidentStatus.RESOLVED && { resolvedAt: new Date() }),
      },
    });

    await this.notifySubscribers(workspaceId, statusPageId, updated);

    return updated;
  }

  async subscribe(statusPageId: string, email: string) {
    const token = crypto.randomBytes(16).toString('hex');
    const subscriber = await prisma.statusPageSubscriber.upsert({
      where: { statusPageId_email: { statusPageId, email } },
      create: {
        statusPageId,
        email,
        verifyToken: token,
      },
      update: {
        verifyToken: token,
        verified: false,
        unsubscribedAt: null,
      },
    });

    const page = await prisma.statusPage.findFirst({ where: { id: statusPageId } });
    if (page) {
      const baseUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
      const verifyUrl = `${baseUrl}/status/${page.slug}/verify?token=${token}&email=${encodeURIComponent(email)}`;
      await this.emailService.sendStatusPageVerification(
        page.workspaceId,
        email,
        page.title,
        verifyUrl,
      );
    }

    return { success: true };
  }

  async verifySubscriber(slug: string, token: string, email: string) {
    const page = await prisma.statusPage.findFirst({ where: { slug } });
    if (!page) {
      return null;
    }

    const subscriber = await prisma.statusPageSubscriber.findFirst({
      where: { statusPageId: page.id, email, verifyToken: token },
    });
    if (!subscriber) {
      return null;
    }

    return prisma.statusPageSubscriber.update({
      where: { id: subscriber.id },
      data: { verified: true },
    });
  }

  async unsubscribe(slug: string, email: string) {
    const page = await prisma.statusPage.findFirst({ where: { slug } });
    if (!page) {
      return null;
    }

    return prisma.statusPageSubscriber.updateMany({
      where: { statusPageId: page.id, email },
      data: { unsubscribedAt: new Date() },
    });
  }

  private async notifySubscribers(
    workspaceId: string,
    statusPageId: string,
    incident: {
      title: string;
      status: StatusIncidentStatus;
      message: string | null;
      impact: StatusIncidentImpact;
    },
  ) {
    const page = await prisma.statusPage.findFirst({ where: { id: statusPageId } });
    if (!page) {
      return;
    }

    const subscribers = await prisma.statusPageSubscriber.findMany({
      where: { statusPageId, verified: true, unsubscribedAt: null },
    });

    const baseUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
    const statusUrl = `${baseUrl}/status/${page.slug}`;

    for (const subscriber of subscribers) {
      await this.emailService.sendStatusPageUpdate(workspaceId, subscriber.email, {
        pageTitle: page.title,
        incidentTitle: incident.title,
        status: incident.status,
        impact: incident.impact,
        message: incident.message ?? '',
        statusUrl,
      });
    }
  }

  private normalizeSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
