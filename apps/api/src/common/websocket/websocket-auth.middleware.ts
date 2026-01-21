import { Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { verifyToken } from '@clerk/backend';
import { prisma } from '@signalcraft/database';

const logger = new Logger('WebSocketAuthMiddleware');

export interface AuthenticatedSocket extends Socket {
    user?: {
        id: string;
        clerkId: string;
        email: string;
        workspaceId: string;
        role: string;
    };
}

/**
 * WebSocket authentication middleware using Clerk JWT verification
 * Verifies the JWT token and attaches user information to the socket
 */
export async function authenticateWebSocket(
    socket: AuthenticatedSocket,
    next: (err?: Error) => void
): Promise<void> {
    try {
        // Extract token from handshake
        const token = socket.handshake.auth.token ||
            socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            logger.warn(`WebSocket connection attempt without token from ${socket.id}`);
            throw new UnauthorizedException('No authentication token provided');
        }

        // ✅ VERIFY JWT TOKEN using Clerk
        const clerkSecret = process.env.CLERK_SECRET_KEY;

        if (!clerkSecret) {
            logger.error('CLERK_SECRET_KEY not configured');
            throw new UnauthorizedException('Server authentication not configured');
        }

        // Verify token with Clerk
        const issuer = `https://clerk.${process.env.CLERK_PUBLISHABLE_KEY?.split('_')[1] || 'clerk'}.com`;

        const verifiedToken = await verifyToken(token, {
            secretKey: clerkSecret,
            issuer,
        });

        if (!verifiedToken || !verifiedToken.sub) {
            logger.warn(`Invalid token for socket ${socket.id}`);
            throw new UnauthorizedException('Invalid or expired token');
        }

        const clerkId = verifiedToken.sub;

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { clerkId },
            select: {
                id: true,
                clerkId: true,
                email: true,
                workspaceId: true,
                role: true,
            },
        });

        if (!user) {
            logger.warn(`User not found for clerkId: ${clerkId}`);
            throw new UnauthorizedException('User not found');
        }

        // ✅ ATTACH USER TO SOCKET
        socket.user = user;

        logger.log(`WebSocket authenticated: user=${user.email}, workspace=${user.workspaceId}, socket=${socket.id}`);

        // Success - proceed to connection
        next();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
        logger.error(`WebSocket auth failed: ${errorMessage}`);

        // Reject connection
        next(new Error(errorMessage));
    }
}

/**
 * Middleware to ensure socket is authenticated
 * Use this as a decorator or guard if needed
 */
export function requireAuth(socket: AuthenticatedSocket): void | never {
    if (!socket.user) {
        throw new UnauthorizedException('Socket not authenticated');
    }
}

/**
 * Middleware to ensure socket user belongs to specified workspace
 */
export function requireWorkspace(socket: AuthenticatedSocket, workspaceId: string): void | never {
    requireAuth(socket);

    if (socket.user!.workspaceId !== workspaceId) {
        throw new UnauthorizedException('Access denied to this workspace');
    }
}
