import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@signalcraft/database';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface IngestReplayDto {
    alertEventId: string;
    sessionId: string;
    duration?: number;
    storageUrl?: string; // R2 URL if uploaded directly
}

export interface SessionReplayResponse {
    id: string;
    sessionId: string;
    duration: number | null;
    storageUrl: string | null;
    createdAt: Date;
}

@Injectable()
export class SessionReplayService {
    private readonly logger = new Logger(SessionReplayService.name);
    private s3Client: S3Client | null = null;
    private bucketName: string | null = null;

    constructor() {
        // Initialize R2 client if credentials are available
        if (
            process.env.R2_ACCESS_KEY_ID &&
            process.env.R2_SECRET_ACCESS_KEY &&
            process.env.R2_ACCOUNT_ID
        ) {
            this.s3Client = new S3Client({
                region: 'auto',
                endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
                credentials: {
                    accessKeyId: process.env.R2_ACCESS_KEY_ID,
                    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
                },
            });
            this.bucketName = process.env.R2_BUCKET_NAME || 'signalcraft-session-replays';
            this.logger.log('R2 client initialized');
        } else {
            this.logger.warn('R2 credentials not configured, using database storage');
        }
    }

    /**
     * Generate presigned URL for uploading a session replay
     */
    async generateUploadUrl(sessionId: string): Promise<{ uploadUrl: string; storageUrl: string }> {
        if (!this.s3Client || !this.bucketName) {
            throw new Error('R2 not configured');
        }

        const key = `replays/${sessionId}.json`;
        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            ContentType: 'application/json',
        });

        const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
        const storageUrl = `https://${this.bucketName}.r2.cloudflarestorage.com/${key}`;

        return { uploadUrl, storageUrl };
    }

    /**
     * Generate presigned URL for downloading a session replay
     */
    async generateDownloadUrl(sessionId: string): Promise<string> {
        if (!this.s3Client || !this.bucketName) {
            throw new Error('R2 not configured');
        }

        const key = `replays/${sessionId}.json`;
        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: key,
        });

        return await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    }

    /**
     * Store session replay metadata (after upload to R2)
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
                    duration: dto.duration,
                    storageUrl: dto.storageUrl,
                },
            });

            this.logger.log(`Updated session replay for event ${dto.alertEventId}`);
            return {
                id: updated.id,
                sessionId: updated.sessionId,
                duration: updated.duration,
                storageUrl: updated.storageUrl,
                createdAt: updated.createdAt,
            };
        }

        // Create new replay metadata
        const replay = await prisma.sessionReplay.create({
            data: {
                alertEventId: dto.alertEventId,
                sessionId: dto.sessionId,
                duration: dto.duration,
                storageUrl: dto.storageUrl,
                events: [], // Required field - empty since events are stored in R2
            },
        });

        this.logger.log(`Created session replay for event ${dto.alertEventId}`);
        return {
            id: replay.id,
            sessionId: replay.sessionId,
            duration: replay.duration,
            storageUrl: replay.storageUrl,
            createdAt: replay.createdAt,
        };
    }

    /**
     * Get session replay for an alert group (from the latest event)
     */
    async getReplayForAlertGroup(
        workspaceId: string,
        alertGroupId: string,
    ): Promise<SessionReplayResponse | null> {
        const latestEvent = await prisma.alertEvent.findFirst({
            where: { alertGroupId, workspaceId },
            orderBy: { occurredAt: 'desc' },
            include: { sessionReplay: true },
        });

        if (!latestEvent?.sessionReplay) {
            return null;
        }

        const replay = latestEvent.sessionReplay;

        // If using R2, generate download URL
        if (replay.storageUrl && this.s3Client) {
            const downloadUrl = await this.generateDownloadUrl(replay.sessionId);
            return {
                id: replay.id,
                sessionId: replay.sessionId,
                duration: replay.duration,
                storageUrl: downloadUrl, // Return presigned URL
                createdAt: replay.createdAt,
            };
        }

        return {
            id: replay.id,
            sessionId: replay.sessionId,
            duration: replay.duration,
            storageUrl: replay.storageUrl,
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

    /**
     * Get session replay for a specific alert event
     */
    async getReplayForEvent(eventId: string): Promise<SessionReplayResponse | null> {
        const replay = await prisma.sessionReplay.findUnique({
            where: { alertEventId: eventId },
        });

        if (!replay) {
            return null;
        }

        // If using R2, generate download URL
        if (replay.storageUrl && this.s3Client) {
            const downloadUrl = await this.generateDownloadUrl(replay.sessionId);
            return {
                id: replay.id,
                sessionId: replay.sessionId,
                duration: replay.duration,
                storageUrl: downloadUrl,
                createdAt: replay.createdAt,
            };
        }

        return {
            id: replay.id,
            sessionId: replay.sessionId,
            duration: replay.duration,
            storageUrl: replay.storageUrl,
            createdAt: replay.createdAt,
        };
    }
}
