import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { prisma } from '@signalcraft/database';
import * as crypto from 'crypto';

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);
  private readonly prismaClient = prisma as any;

  async resolveWorkspaceId(request: any): Promise<string> {
    if (request.workspaceId) {
      return request.workspaceId as string;
    }

    if (request.user?.workspaceId) {
      return request.user.workspaceId as string;
    }

    const clerkId = request.user?.clerkId || request.user?.clerkUserId;
    if (clerkId) {
      const user = await prisma.user.findUnique({ where: { clerkId } });
      if (user?.workspaceId) {
        return user.workspaceId;
      }
    }

    throw new UnauthorizedException('Workspace context missing');
  }

  computeRequestHash(payload: { body: unknown; query: unknown }): string {
    const normalized = this.stableStringify(payload);
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  async findExisting(workspaceId: string, key: string) {
    return this.prismaClient.idempotencyKey.findUnique({
      where: {
        workspaceId_key: {
          workspaceId,
          key,
        },
      },
    });
  }

  async createInProgress(params: {
    workspaceId: string;
    key: string;
    method: string;
    path: string;
    requestHash: string;
    expiresAt: Date | null;
  }) {
    return this.prismaClient.idempotencyKey.create({
      data: {
        workspaceId: params.workspaceId,
        key: params.key,
        method: params.method,
        path: params.path,
        requestHash: params.requestHash,
        status: 'IN_PROGRESS',
        expiresAt: params.expiresAt,
      },
    });
  }

  async markCompleted(id: string, statusCode: number, responseBody: unknown) {
    try {
      await this.prismaClient.idempotencyKey.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          statusCode,
          responseBody: responseBody ?? null,
        },
      });
    } catch (error) {
      this.logger.warn('Failed to update idempotency record', error as Error);
    }
  }

  async markFailed(id: string) {
    try {
      await this.prismaClient.idempotencyKey.delete({ where: { id } });
    } catch (error) {
      this.logger.warn('Failed to delete idempotency record', error as Error);
    }
  }

  async cleanupIfExpired(existing: any) {
    if (existing?.expiresAt && existing.expiresAt < new Date()) {
      await this.prismaClient.idempotencyKey.delete({ where: { id: existing.id } });
      return null;
    }
    return existing;
  }

  private stableStringify(value: any): string {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value !== 'object') {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }
    const keys = Object.keys(value).sort();
    const entries = keys.map((key) => `${JSON.stringify(key)}:${this.stableStringify(value[key])}`);
    return `{${entries.join(',')}}`;
  }
}
