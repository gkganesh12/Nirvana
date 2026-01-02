import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { verifyToken } from '@clerk/backend';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization as string | undefined;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const secretKey = process.env.CLERK_SECRET_KEY;
    const jwtKey = process.env.CLERK_JWT_PUBLIC_KEY;
    const issuer = process.env.CLERK_ISSUER;

    if (!secretKey || !issuer) {
      throw new UnauthorizedException('Clerk configuration missing');
    }

    const verification = await verifyToken(token, {
      secretKey,
      issuer,
      jwtKey: jwtKey || undefined,
    });

    if (!verification?.sub) {
      throw new UnauthorizedException('Invalid token');
    }

    request.user = { clerkId: verification.sub, claims: verification };
    return true;
  }
}
