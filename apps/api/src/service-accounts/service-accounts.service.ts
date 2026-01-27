import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@signalcraft/database';
import { ApiKeyService } from '../api-keys/api-key.service';
import { CreateServiceAccountDto, CreateServiceAccountKeyDto } from './dto/service-account.dto';

@Injectable()
export class ServiceAccountsService {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  private async getUserIdByClerkId(clerkId: string): Promise<string> {
    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.id;
  }

  async createServiceAccount(
    workspaceId: string,
    clerkId: string | undefined,
    dto: CreateServiceAccountDto,
  ) {
    if (!clerkId) {
      throw new BadRequestException('Missing user context');
    }

    const userId = await this.getUserIdByClerkId(clerkId);

    const prismaClient = prisma as any;
    return prismaClient.serviceAccount.create({
      data: {
        workspaceId,
        name: dto.name,
        description: dto.description ?? null,
        createdBy: userId,
      },
    });
  }

  async listServiceAccounts(workspaceId: string) {
    const prismaClient = prisma as any;
    const serviceAccounts = (await prismaClient.serviceAccount.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { apiKeys: true },
        },
      },
    })) as Array<{
      id: string;
      name: string;
      description: string | null;
      createdBy: string | null;
      createdAt: Date;
      updatedAt: Date;
      _count: { apiKeys: number };
    }>;

    return serviceAccounts.map((account) => ({
      id: account.id,
      name: account.name,
      description: account.description,
      createdBy: account.createdBy,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      apiKeyCount: account._count.apiKeys,
    }));
  }

  async createServiceAccountKey(
    workspaceId: string,
    serviceAccountId: string,
    clerkId: string | undefined,
    dto: CreateServiceAccountKeyDto,
  ) {
    if (!clerkId) {
      throw new BadRequestException('Missing user context');
    }

    const prismaClient = prisma as any;
    const serviceAccount = await prismaClient.serviceAccount.findFirst({
      where: {
        id: serviceAccountId,
        workspaceId,
      },
    });

    if (!serviceAccount) {
      throw new NotFoundException('Service account not found');
    }

    const userId = await this.getUserIdByClerkId(clerkId);

    return this.apiKeyService.createApiKey({
      workspaceId,
      createdBy: userId,
      name: dto.name,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      serviceAccountId,
    });
  }

  async listServiceAccountKeys(workspaceId: string, serviceAccountId: string) {
    const prismaClient = prisma as any;
    const serviceAccount = await prismaClient.serviceAccount.findFirst({
      where: {
        id: serviceAccountId,
        workspaceId,
      },
    });

    if (!serviceAccount) {
      throw new NotFoundException('Service account not found');
    }

    return this.apiKeyService.listApiKeysForServiceAccount(workspaceId, serviceAccountId);
  }

  async revokeServiceAccountKey(workspaceId: string, serviceAccountId: string, keyId: string) {
    const prismaClient = prisma as any;
    const apiKey = await prismaClient.apiKey.findFirst({
      where: {
        id: keyId,
        workspaceId,
        serviceAccountId,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found for service account');
    }

    await this.apiKeyService.revokeApiKey(workspaceId, keyId);
  }
}
