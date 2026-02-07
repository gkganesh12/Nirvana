import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyService } from '../api-keys/api-key.service';

/**
 * API Key Authentication Guard
 *
 * Checks for API key in Authorization header: "Bearer sk_live_..."
 * Sets workspaceId in request context if valid
 */
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Extract API key from Authorization header
    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid API key');
    }

    const apiKey = authHeader.substring(7); // Remove "Bearer "

    // Validate the key and get workspace ID
    const validation = await this.apiKeyService.validateApiKey(apiKey);

    if (!validation) {
      throw new UnauthorizedException('Invalid, expired, or revoked API key');
    }

    // Attach workspace ID to request for use in controllers
    request.workspaceId = validation.workspaceId;
    request.authenticationType = 'apiKey';
    request.user = {
      authType: 'apiKey',
      workspaceId: validation.workspaceId,
      apiKeyId: validation.apiKeyId,
      serviceAccountId: validation.serviceAccountId,
    };

    return true;
  }
}
