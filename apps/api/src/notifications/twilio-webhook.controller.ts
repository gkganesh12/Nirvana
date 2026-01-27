import { Body, Controller, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { prisma } from '@signalcraft/database';
import { AlertsService } from '../alerts/alerts.service';

@ApiTags('Twilio')
@Controller('api/v1/twilio')
export class TwilioWebhookController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post('sms')
  @ApiOperation({ summary: 'Twilio SMS webhook for ack' })
  async handleSms(@Body() body: Record<string, string>) {
    const message = body.Body || '';
    const from = body.From || 'unknown';
    const token = this.extractToken(message);

    if (!token) {
      return { success: false, message: 'No token provided' };
    }

    const attempt = await prisma.pagingAttempt.findFirst({
      where: { ackToken: token, ackedAt: null },
      include: { alertGroup: true },
    });

    if (!attempt || !attempt.alertGroup) {
      return { success: false, message: 'Invalid token' };
    }

    await this.alertsService.acknowledgeAlert(attempt.alertGroup.workspaceId, attempt.alertGroupId);

    await prisma.pagingAttempt.update({
      where: { id: attempt.id },
      data: { ackedAt: new Date(), ackSource: `sms:${from}` },
    });

    return { success: true };
  }

  @Post('voice')
  @ApiOperation({ summary: 'Twilio Voice webhook' })
  async handleVoice(@Query('token') token: string, @Res() res: Response) {
    const twiml = `
      <Response>
        <Gather numDigits="1" action="/api/v1/twilio/voice/ack?token=${token}" method="POST">
          <Say>Critical alert from SignalCraft. Press 1 to acknowledge.</Say>
        </Gather>
        <Say>No input received. Goodbye.</Say>
      </Response>
    `;
    res.set('Content-Type', 'text/xml');
    return res.send(twiml.trim());
  }

  @Post('voice/ack')
  @ApiOperation({ summary: 'Twilio Voice ack' })
  async handleVoiceAck(
    @Query('token') token: string,
    @Body() body: Record<string, string>,
    @Res() res: Response,
  ) {
    const digits = body.Digits || '';

    if (digits !== '1') {
      res.set('Content-Type', 'text/xml');
      return res.send('<Response><Say>Invalid input. Goodbye.</Say></Response>');
    }

    const attempt = await prisma.pagingAttempt.findFirst({
      where: { ackToken: token, ackedAt: null },
      include: { alertGroup: true },
    });

    if (attempt?.alertGroup) {
      await this.alertsService.acknowledgeAlert(
        attempt.alertGroup.workspaceId,
        attempt.alertGroupId,
      );
      await prisma.pagingAttempt.update({
        where: { id: attempt.id },
        data: { ackedAt: new Date(), ackSource: 'voice' },
      });
    }

    res.set('Content-Type', 'text/xml');
    return res.send('<Response><Say>Alert acknowledged. Goodbye.</Say></Response>');
  }

  private extractToken(message: string) {
    const match = message.match(/ACK\s+([A-Z0-9]+)/i) || message.match(/([A-Z0-9]{6,})/);
    return match ? match[1].toUpperCase() : null;
  }
}
