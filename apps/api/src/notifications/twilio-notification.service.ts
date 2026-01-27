import { Injectable, Logger } from '@nestjs/common';
import twilio, { Twilio } from 'twilio';
import { SecretsService } from '../common/secrets/secrets.service';

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

@Injectable()
export class TwilioNotificationService {
  private readonly logger = new Logger(TwilioNotificationService.name);

  constructor(private readonly secretsService: SecretsService) {}

  async sendSms(workspaceId: string, to: string, message: string): Promise<boolean> {
    const config = await this.getConfig(workspaceId);
    if (!config) {
      this.logger.warn(`Twilio config missing for workspace ${workspaceId}`);
      return false;
    }

    try {
      const client = this.createClient(config);
      await client.messages.create({
        from: config.fromNumber,
        to,
        body: message,
      });
      return true;
    } catch (error) {
      this.logger.error('Failed to send SMS', error);
      return false;
    }
  }

  async placeCall(
    workspaceId: string,
    to: string,
    message: string,
    options?: { twimlUrl?: string },
  ): Promise<boolean> {
    const config = await this.getConfig(workspaceId);
    if (!config) {
      this.logger.warn(`Twilio config missing for workspace ${workspaceId}`);
      return false;
    }

    try {
      const client = this.createClient(config);
      const twiml = `<Response><Say>${this.escapeXml(message)}</Say></Response>`;
      await client.calls.create({
        from: config.fromNumber,
        to,
        twiml: options?.twimlUrl ? undefined : twiml,
        url: options?.twimlUrl,
      });
      return true;
    } catch (error) {
      this.logger.error('Failed to place call', error);
      return false;
    }
  }

  private createClient(config: TwilioConfig): Twilio {
    return twilio(config.accountSid, config.authToken);
  }

  private async getConfig(workspaceId: string): Promise<TwilioConfig | null> {
    try {
      const accountSid = await this.secretsService.getWorkspaceSecret(
        workspaceId,
        'twilio-account-sid',
      );
      const authToken = await this.secretsService.getWorkspaceSecret(
        workspaceId,
        'twilio-auth-token',
      );
      const fromNumber = await this.secretsService.getWorkspaceSecret(
        workspaceId,
        'twilio-from-number',
      );
      return { accountSid, authToken, fromNumber };
    } catch (error) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_FROM_NUMBER;
      if (!accountSid || !authToken || !fromNumber) {
        return null;
      }
      return { accountSid, authToken, fromNumber };
    }
  }

  private escapeXml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
