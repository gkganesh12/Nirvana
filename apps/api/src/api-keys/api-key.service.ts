import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@signalcraft/database';
import * as crypto from 'crypto';

interface CreateApiKeyDto {
    workspaceId: string;
    createdBy: string;
    name: string;
    expiresAt?: Date;
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
}

@Injectable()
export class ApiKeyService {
    private readonly logger = new Logger(ApiKeyService.name);

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

        const apiKey = await prisma.apiKey.create({
            data: {
                workspaceId: dto.workspaceId,
                createdBy: dto.createdBy,
                name: dto.name,
                keyHash,
                prefix,
                expiresAt: dto.expiresAt || null,
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
        };
    }

    /**
     * List all API keys for a workspace (without actual keys)
     */
    async listApiKeys(workspaceId: string): Promise<ApiKeyResponse[]> {
        const apiKeys = await prisma.apiKey.findMany({
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

        return apiKeys.map((apiKey) => ({
            id: apiKey.id,
            name: apiKey.name,
            prefix: apiKey.prefix,
            // Do NOT include the actual key
            createdAt: apiKey.createdAt,
            expiresAt: apiKey.expiresAt,
            lastUsedAt: apiKey.lastUsedAt,
            revokedAt: apiKey.revokedAt,
            creatorEmail: (apiKey.creator as any).email,
            creatorName: (apiKey.creator as any).displayName,
        }));
    }

    /**
     * Revoke an API key
     */
    async revokeApiKey(workspaceId: string, keyId: string): Promise<void> {
        await prisma.apiKey.updateMany({
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
    async validateApiKey(key: string): Promise<string | null> {
        if (!key || !key.startsWith('sk_live_')) {
            return null;
        }

        const keyHash = crypto.createHash('sha256').update(key).digest('hex');

        const apiKey = await prisma.apiKey.findUnique({
            where: { keyHash },
            select: {
                id: true,
                workspaceId: true,
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
        prisma.apiKey.update({
            where: { id: apiKey.id },
            data: { lastUsedAt: new Date() },
        }).catch((err) => {
            this.logger.error(`Failed to update lastUsedAt for key ${apiKey.id}:`, err);
        });

        return apiKey.workspaceId;
    }

    /**
     * Delete an API key permanently
     */
    async deleteApiKey(workspaceId: string, keyId: string): Promise<void> {
        await prisma.apiKey.deleteMany({
            where: {
                id: keyId,
                workspaceId,
            },
        });

        this.logger.log(`API key deleted: ${keyId}`);
    }
}
