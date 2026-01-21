import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    SecretsManagerClient,
    GetSecretValueCommand,
    PutSecretValueCommand,
    CreateSecretCommand,
    UpdateSecretCommand,
    RotateSecretCommand,
    DescribeSecretCommand,
} from '@aws-sdk/client-secrets-manager';

interface CachedSecret {
    value: string;
    expiresAt: number;
}

@Injectable()
export class SecretsService {
    private readonly logger = new Logger(SecretsService.name);
    private readonly client: SecretsManagerClient;
    private readonly cache = new Map<string, CachedSecret>();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    constructor(private configService: ConfigService) {
        const region = configService.get('AWS_REGION') || 'us-east-1';

        this.client = new SecretsManagerClient({
            region,
            credentials: configService.get('AWS_ACCESS_KEY_ID') ? {
                accessKeyId: configService.get('AWS_ACCESS_KEY_ID')!,
                secretAccessKey: configService.get('AWS_SECRET_ACCESS_KEY')!,
            } : undefined, // Use IAM role if no explicit credentials
        });

        this.logger.log(`SecretsService initialized for region: ${region}`);
    }

    /**
     * Get a secret value from AWS Secrets Manager with caching
     * @param secretName Name/ARN of the secret
     * @returns Secret value as string
     */
    async getSecret(secretName: string): Promise<string> {
        // Check cache first
        const cached = this.cache.get(secretName);
        if (cached && cached.expiresAt > Date.now()) {
            this.logger.debug(`Cache hit for secret: ${secretName}`);
            return cached.value;
        }

        try {
            const command = new GetSecretValueCommand({
                SecretId: secretName,
            });

            const response = await this.client.send(command);

            if (!response.SecretString) {
                throw new Error(`Secret ${secretName} has no value`);
            }

            const secretValue = response.SecretString;

            // Cache the secret
            this.cache.set(secretName, {
                value: secretValue,
                expiresAt: Date.now() + this.CACHE_TTL,
            });

            this.logger.log(`Retrieved secret: ${secretName}`);
            return secretValue;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to retrieve secret ${secretName}: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Get a secret and parse it as JSON
     */
    async getSecretJson<T = any>(secretName: string): Promise<T> {
        const secretString = await this.getSecret(secretName);
        try {
            return JSON.parse(secretString) as T;
        } catch (error) {
            throw new Error(`Secret ${secretName} is not valid JSON`);
        }
    }

    /**
     * Create or update a secret
     */
    async setSecret(secretName: string, secretValue: string): Promise<void> {
        try {
            // Try to update existing secret first
            const updateCommand = new PutSecretValueCommand({
                SecretId: secretName,
                SecretString: secretValue,
            });

            await this.client.send(updateCommand);
            this.logger.log(`Updated secret: ${secretName}`);

            // Invalidate cache
            this.cache.delete(secretName);
        } catch (error: any) {
            // If secret doesn't exist, create it
            if (error.name === 'ResourceNotFoundException') {
                const createCommand = new CreateSecretCommand({
                    Name: secretName,
                    SecretString: secretValue,
                    Description: `Created by SignalCraft API`,
                });

                await this.client.send(createCommand);
                this.logger.log(`Created secret: ${secretName}`);
            } else {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                this.logger.error(`Failed to set secret ${secretName}: ${errorMessage}`);
                throw error;
            }
        }
    }

    /**
     * Set a secret as JSON
     */
    async setSecretJson(secretName: string, secretValue: any): Promise<void> {
        const jsonString = JSON.stringify(secretValue);
        await this.setSecret(secretName, jsonString);
    }

    /**
     * Rotate a secret (trigger rotation lambda)
     */
    async rotateSecret(secretName: string): Promise<void> {
        try {
            const command = new RotateSecretCommand({
                SecretId: secretName,
                RotateImmediately: true,
            });

            await this.client.send(command);
            this.logger.log(`Initiated rotation for secret: ${secretName}`);

            // Invalidate cache
            this.cache.delete(secretName);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to rotate secret ${secretName}: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Check if a secret exists
     */
    async secretExists(secretName: string): Promise<boolean> {
        try {
            const command = new DescribeSecretCommand({
                SecretId: secretName,
            });

            await this.client.send(command);
            return true;
        } catch (error: any) {
            if (error.name === 'ResourceNotFoundException') {
                return false;
            }
            throw error;
        }
    }

    /**
     * Clear the cache for a specific secret or all secrets
     */
    clearCache(secretName?: string): void {
        if (secretName) {
            this.cache.delete(secretName);
            this.logger.debug(`Cleared cache for secret: ${secretName}`);
        } else {
            this.cache.clear();
            this.logger.debug('Cleared all secret cache');
        }
    }

    /**
     * Helper: Get workspace-specific secret
     */
    async getWorkspaceSecret(workspaceId: string, secretType: string): Promise<string> {
        const secretName = `signalcraft/${workspaceId}/${secretType}`;
        return this.getSecret(secretName);
    }

    /**
     * Helper: Set workspace-specific secret
     */
    async setWorkspaceSecret(
        workspaceId: string,
        secretType: string,
        secretValue: string | object
    ): Promise<void> {
        const secretName = `signalcraft/${workspaceId}/${secretType}`;

        if (typeof secretValue === 'object') {
            await this.setSecretJson(secretName, secretValue);
        } else {
            await this.setSecret(secretName, secretValue);
        }
    }
}
