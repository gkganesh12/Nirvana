import { Injectable } from '@nestjs/common';
import { prisma } from '@signalcraft/database';
import { SecretsService } from '../common/secrets/secrets.service';
import { TwilioNotificationService } from '../notifications/twilio-notification.service';

export interface NotificationPreferences {
  defaultChannel: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  escalationEnabled: boolean;
  escalationMinutes: number;
}

@Injectable()
export class SettingsService {
  // In-memory mock for notification preferences since we don't have a model yet
  private mockPreferences: NotificationPreferences = {
    defaultChannel: '#alerts',
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    escalationEnabled: true,
    escalationMinutes: 15,
  };

  constructor(
    private readonly secretsService: SecretsService,
    private readonly twilioService: TwilioNotificationService,
  ) {}

  async getWorkspaceSettings(workspaceId: string) {
    return prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        // Impact Threshold Configuration
        highImpactUserThreshold: true,
        mediumImpactUserThreshold: true,
        highVelocityThreshold: true,
      },
    });
  }

  async updateWorkspaceSettings(
    workspaceId: string,
    data: {
      name?: string;
      highImpactUserThreshold?: number;
      mediumImpactUserThreshold?: number;
      highVelocityThreshold?: number;
    },
  ) {
    return prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.highImpactUserThreshold !== undefined && {
          highImpactUserThreshold: data.highImpactUserThreshold,
        }),
        ...(data.mediumImpactUserThreshold !== undefined && {
          mediumImpactUserThreshold: data.mediumImpactUserThreshold,
        }),
        ...(data.highVelocityThreshold !== undefined && {
          highVelocityThreshold: data.highVelocityThreshold,
        }),
      },
    });
  }

  async getUsers(workspaceId: string) {
    return prisma.user.findMany({
      where: { workspaceId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async inviteUser(workspaceId: string, email: string) {
    // Mock invitation - just return success
    // In production, this would create an invitation record and send an email
    return { success: true, message: `Invitation sent to ${email}` };
  }

  getNotificationPreferences(workspaceId: string) {
    return this.mockPreferences;
  }

  updateNotificationPreferences(workspaceId: string, preferences: NotificationPreferences) {
    this.mockPreferences = { ...this.mockPreferences, ...preferences };
    return this.mockPreferences;
  }

  async getTwilioSettings(workspaceId: string) {
    try {
      const accountSid = await this.secretsService.getWorkspaceSecret(
        workspaceId,
        'twilio-account-sid',
      );
      const fromNumber = await this.secretsService.getWorkspaceSecret(
        workspaceId,
        'twilio-from-number',
      );
      return {
        configured: true,
        accountSidMasked: `${accountSid.slice(0, 4)}...${accountSid.slice(-4)}`,
        fromNumber,
      };
    } catch (error) {
      const envAccountSid = process.env.TWILIO_ACCOUNT_SID;
      const envFromNumber = process.env.TWILIO_FROM_NUMBER;
      if (envAccountSid && envFromNumber) {
        return {
          configured: true,
          accountSidMasked: `${envAccountSid.slice(0, 4)}...${envAccountSid.slice(-4)}`,
          fromNumber: envFromNumber,
        };
      }
      return { configured: false };
    }
  }

  async setTwilioSettings(
    workspaceId: string,
    data: { accountSid: string; authToken: string; fromNumber: string },
  ) {
    await this.secretsService.setWorkspaceSecret(
      workspaceId,
      'twilio-account-sid',
      data.accountSid,
    );
    await this.secretsService.setWorkspaceSecret(workspaceId, 'twilio-auth-token', data.authToken);
    await this.secretsService.setWorkspaceSecret(
      workspaceId,
      'twilio-from-number',
      data.fromNumber,
    );
    return { success: true };
  }

  async testTwilioSettings(workspaceId: string, data: { to: string; channel: 'SMS' | 'VOICE' }) {
    if (data.channel === 'VOICE') {
      const ok = await this.twilioService.placeCall(
        workspaceId,
        data.to,
        'SignalCraft test call. This is a test of the wake-up routing.',
      );
      return { success: ok };
    }

    const ok = await this.twilioService.sendSms(
      workspaceId,
      data.to,
      'SignalCraft test SMS. This is a test of the wake-up routing.',
    );
    return { success: ok };
  }
}
