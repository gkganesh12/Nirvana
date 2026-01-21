import { Controller, Get, Post, Body, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { SessionReplayService } from './session-replay.service';

class IngestReplayDto {
    alertEventId!: string;
    sessionId!: string;
    duration?: number;
    storageUrl?: string;
}

@ApiTags('session-replay')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('api/session-replay')
export class SessionReplayController {
    constructor(private readonly sessionReplayService: SessionReplayService) { }

    @Get('upload-url/:sessionId')
    @ApiOperation({ summary: 'Generate presigned URL for uploading session replay' })
    async getUploadUrl(@Param('sessionId') sessionId: string) {
        return this.sessionReplayService.generateUploadUrl(sessionId);
    }

    @Post('ingest')
    @ApiOperation({ summary: 'Save session replay metadata after upload' })
    async ingestReplay(@WorkspaceId() workspaceId: string, @Body() dto: IngestReplayDto) {
        return this.sessionReplayService.ingestReplay(workspaceId, dto);
    }

    @Get('alert-group/:id')
    @ApiOperation({ summary: 'Get session replay for an alert group' })
    async getReplayForAlertGroup(
        @WorkspaceId() workspaceId: string,
        @Param('id') alertGroupId: string,
    ) {
        const replay = await this.sessionReplayService.getReplayForAlertGroup(workspaceId, alertGroupId);
        if (!replay) {
            throw new NotFoundException('No session replay found for this alert group');
        }
        return replay;
    }

    @Get('alert-group/:id/exists')
    @ApiOperation({ summary: 'Check if session replay exists for an alert group' })
    async hasReplay(
        @WorkspaceId() workspaceId: string,
        @Param('id') alertGroupId: string,
    ) {
        const hasReplay = await this.sessionReplayService.hasReplay(workspaceId, alertGroupId);
        return { hasReplay };
    }

    @Get('event/:id')
    @ApiOperation({ summary: 'Get session replay for a specific event' })
    async getReplayForEvent(@Param('id') eventId: string) {
        const replay = await this.sessionReplayService.getReplayForEvent(eventId);
        if (!replay) {
            throw new NotFoundException('No session replay found for this event');
        }
        return replay;
    }
}
