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
    const issuer = process.env.CLERK_ISSUER;

    let jwtKey = process.env.CLERK_JWT_PUBLIC_KEY;
    if (jwtKey?.startsWith('pk_')) {
      console.warn(
        'CLERK_JWT_PUBLIC_KEY appears to be a Publishable Key (pk_...), ignoring it. Using Secret Key for verification.',
      );
      jwtKey = undefined;
    }

    if (!secretKey || !issuer) {
      throw new UnauthorizedException('Clerk configuration missing');
    }

    let verification;
    try {
      verification = await verifyToken(token, {
        secretKey,
        issuer,
        jwtKey: jwtKey || undefined,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`Token verification failed (Issuer: ${issuer}):`, errorMessage);
      throw new UnauthorizedException(`Invalid token signature: ${errorMessage}`);
    }

    if (!verification?.sub) {
      throw new UnauthorizedException('Invalid token claims');
    }

    // Standardize user object on request
    request.user = {
      clerkUserId: verification.sub,
      clerkId: verification.sub,
      claims: verification,
      authType: 'clerk',
    };
    request.authenticationType = 'clerk';
    return true;
  }
}
