import {
  Body,
  Controller,
  Headers,
  Logger,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import crypto from 'crypto';
import { AlertProcessorService } from '../alerts/alert-processor.service';
import { SentryWebhookDto, DatadogWebhookDto } from './dto/ingest-webhook.dto';
import { SecretsService } from '../common/secrets/secrets.service';
import {
  ValidationException,
  AuthenticationException,
  ConfigurationException,
} from '../common/exceptions/base.exception';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly alertProcessor: AlertProcessorService,
    private readonly secretsService: SecretsService,
  ) { }

  /**
   * Sentry webhook endpoint with automated validation
   */
  @Post('sentry')
  @ApiOperation({ summary: 'Ingest Sentry webhook', description: 'Receives and processes alerts from Sentry. Requires signature verification.' })
  @ApiHeader({ name: 'x-sentry-hook-signature', description: 'Cryptographic signature from Sentry', required: true })
  @ApiHeader({ name: 'x-workspace-id', description: 'SignalCraft Workspace ID', required: false })
  @ApiQuery({ name: 'workspaceId', description: 'SignalCraft Workspace ID (can be in query or header)', required: false })
  @ApiResponse({ status: 201, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid signature or authentication failure' })
  @ApiResponse({ status: 422, description: 'Missing workspaceId or validation failed' })
  @Throttle({ default: { ttl: 60000, limit: 100 } }) // 100 requests per minute
  async handleSentryWebhook(
    @Req() req: { body: Buffer },
    @Body() payload: SentryWebhookDto,
    @Headers('x-sentry-hook-signature') signature: string | undefined,
    @Headers('x-workspace-id') workspaceHeader: string | undefined,
    @Query('workspaceId') workspaceQuery: string | undefined,
  ) {
    const workspaceId = workspaceHeader ?? workspaceQuery;
    if (!workspaceId) {
      throw new ValidationException('Missing workspaceId');
    }

    const rawBody = req.body?.toString('utf8') ?? '';

    // ✅ SECURE: Verify signature using secret from AWS Secrets Manager
    await this.verifySentrySignature(workspaceId, rawBody, signature);

    this.logger.log(`Sentry webhook received`, {
      workspaceId,
      payloadSize: rawBody.length,
    });

    const result = await this.alertProcessor.processSentryEvent({
      workspaceId,
      payload: payload as unknown as Record<string, unknown>,
    });

    return { status: 'ok', ...result };
  }

  /**
   * Datadog webhook endpoint with automated validation
   */
  @Post('datadog')
  @ApiOperation({ summary: 'Ingest Datadog webhook', description: 'Receives and processes alerts from Datadog. Requires token verification.' })
  @ApiHeader({ name: 'x-datadog-token', description: 'Auth token from Datadog', required: false })
  @ApiQuery({ name: 'token', description: 'Auth token from Datadog (can be in query or header)', required: false })
  @ApiQuery({ name: 'workspaceId', description: 'SignalCraft Workspace ID', required: true })
  @ApiResponse({ status: 201, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid token or authentication failure' })
  @ApiResponse({ status: 422, description: 'Missing workspaceId or validation failed' })
  @Throttle({ default: { ttl: 60000, limit: 100 } })
  async handleDatadogWebhook(
    @Body() payload: DatadogWebhookDto,
    @Query('token') tokenQuery: string | undefined,
    @Headers('x-datadog-token') tokenHeader: string | undefined,
    @Query('workspaceId') workspaceId: string,
  ) {
    if (!workspaceId) {
      throw new ValidationException('Missing workspaceId');
    }

    // ✅ SECURE: Verify token using secret from AWS Secrets Manager
    await this.verifyDatadogToken(workspaceId, tokenQuery ?? tokenHeader);

    this.logger.log(`Datadog webhook received`, { workspaceId });

    const result = await this.alertProcessor.processDatadogEvent({
      workspaceId,
      payload: payload as unknown as Record<string, unknown>,
    });

    return { status: 'ok', ...result };
  }

  private async verifySentrySignature(workspaceId: string, rawBody: string, signature?: string) {
    let secret: string;
    try {
      // ✅ RETRIEVE FROM SECRETS MANAGER
      secret = await this.secretsService.getSecret(`signalcraft/${workspaceId}/sentry-secret`);
    } catch (error) {
      // Fallback to env if secret manager fails or secret not found (migration period)
      secret = process.env.SENTRY_WEBHOOK_SECRET ?? '';
      if (!secret) {
        throw new ConfigurationException('Sentry secret not configured', 'SENTRY_WEBHOOK_SECRET');
      }
      this.logger.warn(`Sentry secret not found in Secrets Manager for ${workspaceId}, using fallback`);
    }

    if (!signature) {
      throw new AuthenticationException('Missing Sentry signature');
    }

    const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const digestBuffer = Buffer.from(digest);
    const signatureBuffer = Buffer.from(signature);

    if (digestBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(digestBuffer, signatureBuffer)) {
      throw new AuthenticationException('Invalid Sentry signature');
    }
  }

  private async verifyDatadogToken(workspaceId: string, receivedToken?: string) {
    let secret: string;
    try {
      // ✅ RETRIEVE FROM SECRETS MANAGER
      secret = await this.secretsService.getSecret(`signalcraft/${workspaceId}/datadog-token`);
    } catch (error) {
      secret = process.env.DATADOG_WEBHOOK_SECRET ?? '';
      if (!secret) {
        throw new ConfigurationException('Datadog token not configured', 'DATADOG_WEBHOOK_SECRET');
      }
      this.logger.warn(`Datadog token not found in Secrets Manager for ${workspaceId}, using fallback`);
    }

    if (!receivedToken || receivedToken !== secret) {
      throw new AuthenticationException('Invalid Datadog token');
    }
  }
}
