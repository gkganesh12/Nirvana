import { Controller, Headers, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Webhook } from 'svix';
import { AuthService } from './auth.service';

interface ClerkWebhookPayload {
  id: string;
  type: string;
  data: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email_addresses?: Array<{ email_address: string; id: string }>;
    primary_email_address_id?: string | null;
  };
}

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly authService: AuthService) {}

  @Post('clerk')
  async handleClerkWebhook(
    @Req() req: { body: Buffer },
    @Headers('svix-id') svixId: string,
    @Headers('svix-timestamp') svixTimestamp: string,
    @Headers('svix-signature') svixSignature: string,
  ) {
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) {
      return { status: 'skipped', reason: 'missing_webhook_secret' };
    }

    const webhook = new Webhook(secret);
    const payload = req.body?.toString('utf8') ?? '';

    const event = webhook.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookPayload;

    if (event.type === 'user.created') {
      await this.authService.upsertFromClerk(event);
    }

    return { status: 'ok' };
  }
}
