import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { WorkspaceId } from '../common/decorators/workspace-id.decorator';
import { UserId } from '../common/decorators/user-id.decorator';
import { ApiKeyService } from './api-key.service';

class CreateApiKeyDto {
    name: string;
    expiresAt?: string; // ISO date string
}

@ApiTags('API Keys')
@ApiBearerAuth()
@Controller('api/api-keys')
@UseGuards(ClerkAuthGuard)
export class ApiKeysController {
    constructor(private readonly apiKeyService: ApiKeyService) { }

    @Post()
    @ApiOperation({ summary: 'Generate a new API key' })
    @ApiBody({ type: CreateApiKeyDto })
    async createApiKey(
        @WorkspaceId() workspaceId: string,
        @UserId() userId: string,
        @Body() dto: CreateApiKeyDto,
    ) {
        return this.apiKeyService.createApiKey({
            workspaceId,
            createdBy: userId,
            name: dto.name,
            expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        });
    }

    @Get()
    @ApiOperation({ summary: 'List all API keys for workspace' })
    async listApiKeys(@WorkspaceId() workspaceId: string) {
        return this.apiKeyService.listApiKeys(workspaceId);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Revoke an API key' })
    async revokeApiKey(
        @WorkspaceId() workspaceId: string,
        @Param('id') keyId: string,
    ) {
        await this.apiKeyService.revokeApiKey(workspaceId, keyId);
        return { success: true, message: 'API key revoked' };
    }
}
