import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { ApiKeyAuthGuard } from '../api-keys/api-key-auth.guard';

@Injectable()
export class ApiOrClerkAuthGuard implements CanActivate {
  constructor(
    private readonly clerkAuthGuard: ClerkAuthGuard,
    private readonly apiKeyAuthGuard: ApiKeyAuthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const result = await this.clerkAuthGuard.canActivate(context);
      return Boolean(result);
    } catch (err) {
      try {
        const result = await this.apiKeyAuthGuard.canActivate(context);
        return Boolean(result);
      } catch {
        if (err instanceof UnauthorizedException) {
          throw err;
        }
        throw new UnauthorizedException('Unauthorized');
      }
    }
  }
}
