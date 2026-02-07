import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@signalcraft/database';
import * as crypto from 'crypto';

interface CreateApiKeyDto {
  workspaceId: string;
  createdBy: string;
  name: string;
  expiresAt?: Date;
  serviceAccountId?: string;
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  prefix: string;
  key?: string; // Only returned once on creation
  createdAt: Date;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  serviceAccountId?: string | null;
}

export interface ApiKeyValidationResult {
  apiKeyId: string;
  workspaceId: string;
  serviceAccountId: string | null;
}

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);
  private readonly prismaClient = prisma as any;

  /**
   * Generate a new API key
   * Format: sk_live_<32_random_bytes_hex>
   */
  async createApiKey(dto: CreateApiKeyDto): Promise<ApiKeyResponse> {
    // Generate random key
    const randomBytes = crypto.randomBytes(32);
    const key = `sk_live_${randomBytes.toString('hex')}`;

    // Hash the key for storage
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');

    // Extract prefix for display
    const prefix = key.substring(0, 16); // "sk_live_" + first 8 hex chars

    const apiKey = await this.prismaClient.apiKey.create({
      data: {
        workspaceId: dto.workspaceId,
        createdBy: dto.createdBy,
        name: dto.name,
        keyHash,
        prefix,
        expiresAt: dto.expiresAt || null,
        serviceAccountId: dto.serviceAccountId || null,
      },
    });

    this.logger.log(`API key created: ${apiKey.id} for workspace ${dto.workspaceId}`);

    return {
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      key, // Return the actual key ONLY on creation
      createdAt: apiKey.createdAt,
      expiresAt: apiKey.expiresAt,
      lastUsedAt: apiKey.lastUsedAt,
      revokedAt: apiKey.revokedAt,
      serviceAccountId: apiKey.serviceAccountId,
    };
  }

  /**
   * List all API keys for a workspace (without actual keys)
   */
  async listApiKeys(workspaceId: string): Promise<ApiKeyResponse[]> {
    const apiKeys = await this.prismaClient.apiKey.findMany({
      where: {
        workspaceId,
        revokedAt: null, // Only show active keys
      },
      orderBy: { createdAt: 'desc' },
      include: {
        creator: {
          select: {
            email: true,
            displayName: true,
          },
        },
      },
    });

    return apiKeys.map((apiKey: any) => ({
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      // Do NOT include the actual key
      createdAt: apiKey.createdAt,
      expiresAt: apiKey.expiresAt,
      lastUsedAt: apiKey.lastUsedAt,
      revokedAt: apiKey.revokedAt,
      serviceAccountId: apiKey.serviceAccountId,
      creatorEmail: (apiKey.creator as any).email,
      creatorName: (apiKey.creator as any).displayName,
    }));
  }

  async listApiKeysForServiceAccount(
    workspaceId: string,
    serviceAccountId: string,
  ): Promise<ApiKeyResponse[]> {
    const apiKeys = await this.prismaClient.apiKey.findMany({
      where: {
        workspaceId,
        serviceAccountId,
        revokedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    return apiKeys.map((apiKey: any) => ({
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      createdAt: apiKey.createdAt,
      expiresAt: apiKey.expiresAt,
      lastUsedAt: apiKey.lastUsedAt,
      revokedAt: apiKey.revokedAt,
      serviceAccountId: apiKey.serviceAccountId,
    }));
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(workspaceId: string, keyId: string): Promise<void> {
    await this.prismaClient.apiKey.updateMany({
      where: {
        id: keyId,
        workspaceId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    this.logger.log(`API key revoked: ${keyId}`);
  }

  /**
   * Validate an API key and return workspace ID
   * Returns null if invalid/expired/revoked
   */
  async validateApiKey(key: string): Promise<ApiKeyValidationResult | null> {
    if (!key || !key.startsWith('sk_live_')) {
      return null;
    }

    const keyHash = crypto.createHash('sha256').update(key).digest('hex');

    const apiKey = await this.prismaClient.apiKey.findUnique({
      where: { keyHash },
      select: {
        id: true,
        workspaceId: true,
        serviceAccountId: true,
        expiresAt: true,
        revokedAt: true,
      },
    });

    if (!apiKey) {
      return null;
    }

    // Check if revoked
    if (apiKey.revokedAt) {
      return null;
    }

    // Check if expired
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    // Update last used timestamp (async, don't wait)
    this.prismaClient.apiKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((err: any) => {
        this.logger.error(`Failed to update lastUsedAt for key ${apiKey.id}:`, err);
      });

    return {
      apiKeyId: apiKey.id,
      workspaceId: apiKey.workspaceId,
      serviceAccountId: apiKey.serviceAccountId ?? null,
    };
  }

  /**
   * Delete an API key permanently
   */
  async deleteApiKey(workspaceId: string, keyId: string): Promise<void> {
    await this.prismaClient.apiKey.deleteMany({
      where: {
        id: keyId,
        workspaceId,
      },
    });

    this.logger.log(`API key deleted: ${keyId}`);
  }
}
