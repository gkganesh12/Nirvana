import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@signalcraft/database';

interface IngestReplayDto {
    alertEventId: string;
    sessionId: string;
    duration?: number;
    events: unknown[]; // rrweb events
}

export interface SessionReplayResponse {
    id: string;
    sessionId: string;
    duration: number | null;
    events: unknown[];
    createdAt: Date;
}

@Injectable()
export class SessionReplayService {
    private readonly logger = new Logger(SessionReplayService.name);

    /**
     * Store a session replay for an alert event
     */
    async ingestReplay(workspaceId: string, dto: IngestReplayDto): Promise<SessionReplayResponse> {
        // Verify the alert event exists and belongs to the workspace
        const alertEvent = await prisma.alertEvent.findFirst({
            where: { id: dto.alertEventId, workspaceId },
        });

        if (!alertEvent) {
            throw new Error('Alert event not found');
        }

        // Check if replay already exists for this event
        const existing = await prisma.sessionReplay.findUnique({
            where: { alertEventId: dto.alertEventId },
        });

        if (existing) {
            // Update existing replay
            const updated = await prisma.sessionReplay.update({
                where: { id: existing.id },
                data: {
                    events: dto.events as any,
                    duration: dto.duration,
                    compressedSize: JSON.stringify(dto.events).length,
                },
            });

            this.logger.log(`Updated session replay for event ${dto.alertEventId}`);
            return {
                id: updated.id,
                sessionId: updated.sessionId,
                duration: updated.duration,
                events: updated.events as unknown[],
                createdAt: updated.createdAt,
            };
        }

        // Create new replay
        const replay = await prisma.sessionReplay.create({
            data: {
                alertEventId: dto.alertEventId,
                sessionId: dto.sessionId,
                duration: dto.duration,
                events: dto.events as any,
                compressedSize: JSON.stringify(dto.events).length,
            },
        });

        this.logger.log(`Created session replay for event ${dto.alertEventId}`);
        return {
            id: replay.id,
            sessionId: replay.sessionId,
            duration: replay.duration,
            events: replay.events as unknown[],
            createdAt: replay.createdAt,
        };
    }

    /**
     * Get session replay for an alert group (from the latest event)
     */
    async getReplayForAlertGroup(workspaceId: string, alertGroupId: string): Promise<SessionReplayResponse | null> {
        // Get the most recent event for this alert group
        const latestEvent = await prisma.alertEvent.findFirst({
            where: { alertGroupId, workspaceId },
            orderBy: { occurredAt: 'desc' },
            include: { sessionReplay: true },
        });

        if (!latestEvent?.sessionReplay) {
            return null;
        }

        const replay = latestEvent.sessionReplay;
        return {
            id: replay.id,
            sessionId: replay.sessionId,
            duration: replay.duration,
            events: replay.events as unknown[],
            createdAt: replay.createdAt,
        };
    }

    /**
     * Get session replay for a specific alert event
     */
    async getReplayForEvent(alertEventId: string): Promise<SessionReplayResponse | null> {
        const replay = await prisma.sessionReplay.findUnique({
            where: { alertEventId },
        });

        if (!replay) {
            return null;
        }

        return {
            id: replay.id,
            sessionId: replay.sessionId,
            duration: replay.duration,
            events: replay.events as unknown[],
            createdAt: replay.createdAt,
        };
    }

    /**
     * Check if a session replay exists for an alert group
     */
    async hasReplay(workspaceId: string, alertGroupId: string): Promise<boolean> {
        const latestEvent = await prisma.alertEvent.findFirst({
            where: { alertGroupId, workspaceId },
            orderBy: { occurredAt: 'desc' },
            include: { sessionReplay: true },
        });

        return !!latestEvent?.sessionReplay;
    }
}
