import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { authenticateWebSocket, AuthenticatedSocket, requireWorkspace } from './websocket-auth.middleware';

@WebSocketGateway({
    cors: {
        origin: process.env.FRONTEND_URL || '*', // Use env var for production
    },
    namespace: 'events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;

    private readonly logger = new Logger(EventsGateway.name);

    constructor() {
        // Apply authentication middleware to all connections
        // Note: This is typically done in the gateway initialization
    }

    async handleConnection(client: AuthenticatedSocket) {
        // ✅ AUTHENTICATE using JWT verification middleware
        await authenticateWebSocket(client, (error) => {
            if (error) {
                this.logger.error(`Connection rejected: ${error.message}`);
                client.disconnect();
                return;
            }

            // Connection authenticated successfully
            const workspaceId = client.user!.workspaceId;

            // Auto-join workspace room
            void client.join(`workspace:${workspaceId}`);

            this.logger.log(
                `Client connected: ${client.id} | User: ${client.user!.email} | Workspace: ${workspaceId}`
            );
        });
    }

    handleDisconnect(client: AuthenticatedSocket) {
        const userId = client.user?.email || 'unknown';
        this.logger.log(`Client disconnected: ${client.id} (${userId})`);
    }

    @SubscribeMessage('join_workspace')
    async handleJoinWorkspace(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { workspaceId: string },
    ) {
        // Verify user has access to workspace
        requireWorkspace(client, data.workspaceId);

        await client.join(`workspace:${data.workspaceId}`);
        this.logger.log(`User ${client.user!.email} joined workspace ${data.workspaceId}`);

        return { event: 'joined', workspaceId: data.workspaceId };
    }

    /**
     * Broadcast an event to a workspace
     */
    emitToWorkspace(workspaceId: string, event: string, data: any) {
        this.server.to(`workspace:${workspaceId}`).emit(event, data);
    }
}
