import { Injectable, Logger } from '@nestjs/common';
import { prisma } from '@signalcraft/database';
import * as sgMail from '@sendgrid/mail';

interface SendAlertEmailDto {
    to: string;
    alertTitle: string;
    alertMessage: string;
    severity: string;
    project: string;
    environment: string;
    alertUrl: string;
}

@Injectable()
export class EmailNotificationService {
    private readonly logger = new Logger(EmailNotificationService.name);

    constructor() { }

    /**
     * Send an alert notification email
     */
    async sendAlertNotification(
        workspaceId: string,
        dto: SendAlertEmailDto,
    ): Promise<boolean> {
        try {
            // Get email integration for workspace
            const emailIntegration = await prisma.emailIntegration.findUnique({
                where: { workspaceId },
            });

            if (!emailIntegration || !emailIntegration.verified) {
                this.logger.warn(`No verified email integration for workspace ${workspaceId}`);
                return false;
            }

            // Use API key directly (TODO: add encryption)
            sgMail.setApiKey(emailIntegration.apiKey);

            // Determine color based on severity
            const severityColor = this.getSeverityColor(dto.severity);

            const msg = {
                to: dto.to,
                from: {
                    email: emailIntegration.fromEmail,
                    name: emailIntegration.fromName || 'SignalCraft Alerts',
                },
                subject: `[${dto.severity}] ${dto.alertTitle}`,
                html: this.generateAlertEmailHtml(dto, severityColor),
            };

            await sgMail.send(msg);
            this.logger.log(`Alert email sent to ${dto.to} for workspace ${workspaceId}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to send alert email:`, error);
            return false;
        }
    }

    /**
     * Send escalation notification email
     */
    async sendEscalationEmail(
        workspaceId: string,
        to: string,
        alertTitle: string,
        alertMessage: string,
        severity: string,
        escalationLevel: number,
        alertUrl: string,
    ): Promise<boolean> {
        try {
            const emailIntegration = await prisma.emailIntegration.findUnique({
                where: { workspaceId },
            });

            if (!emailIntegration || !emailIntegration.verified) {
                return false;
            }

            const apiKey = this.encryptionService.decrypt(emailIntegration.apiKey);
            sgMail.setApiKey(apiKey);

            const msg = {
                to,
                from: {
                    email: emailIntegration.fromEmail,
                    name: emailIntegration.fromName || 'SignalCraft Alerts',
                },
                subject: `🚨 ESCALATION Level ${escalationLevel}: ${alertTitle}`,
                html: this.generateEscalationEmailHtml({
                    alertTitle,
                    alertMessage,
                    severity,
                    escalationLevel,
                    alertUrl,
                }),
            };

            await sgMail.send(msg);
            this.logger.log(`Escalation email (L${escalationLevel}) sent to ${to}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to send escalation email:`, error);
            return false;
        }
    }

    /**
     * Test email configuration
     */
    async sendTestEmail(
        workspaceId: string,
        to: string,
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const emailIntegration = await prisma.emailIntegration.findUnique({
                where: { workspaceId },
            });

            if (!emailIntegration) {
                return { success: false, error: 'No email integration configured' };
            }

            const apiKey = this.encryptionService.decrypt(emailIntegration.apiKey);
            sgMail.setApiKey(apiKey);

            const msg = {
                to,
                from: {
                    email: emailIntegration.fromEmail,
                    name: emailIntegration.fromName || 'SignalCraft',
                },
                subject: 'SignalCraft Email Integration Test',
                html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #dc2626;">✓ Email Integration Active</h2>
            <p style="color: #52525b;">
              Your SignalCraft email integration is working correctly!
            </p>
            <p style="color: #71717a; font-size: 14px;">
              This is a test email to verify your SendGrid configuration.
            </p>
          </div>
        `,
            };

            await sgMail.send(msg);
            return { success: true };
        } catch (error: any) {
            this.logger.error(`Test email failed:`, error);
            return { success: false, error: error.message };
        }
    }

    private getSeverityColor(severity: string): string {
        switch (severity.toUpperCase()) {
            case 'CRITICAL':
                return '#dc2626'; // Red
            case 'HIGH':
                return '#ea580c'; // Orange
            case 'MEDIUM':
                return '#f59e0b'; // Amber
            case 'LOW':
                return '#3b82f6'; // Blue
            default:
                return '#71717a'; // Gray
        }
    }

    private generateAlertEmailHtml(dto: SendAlertEmailDto, color: string): string {
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #09090b;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #18181b; border-radius: 12px; border: 1px solid #27272a;">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 30px 30px 20px; border-bottom: 1px solid #27272a;">
                      <h1 style="margin: 0; color: #fafafa; font-size: 24px;">SignalCraft Alert</h1>
                    </td>
                  </tr>
                  
                  <!-- Severity Badge -->
                  <tr>
                    <td style="padding: 20px 30px 10px;">
                      <div style="display: inline-block; background-color: ${color}20; color: ${color}; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                        ${dto.severity}
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Alert Content -->
                  <tr>
                    <td style="padding: 10px 30px;">
                      <h2 style="margin: 0 0 10px; color: #fafafa; font-size: 20px;">${dto.alertTitle}</h2>
                      <p style="margin: 0; color: #a1a1aa; line-height: 1.5;">${dto.alertMessage}</p>
                    </td>
                  </tr>
                  
                  <!-- Metadata -->
                  <tr>
                    <td style="padding: 20px 30px;">
                      <table width="100%" cellpadding="8" cellspacing="0">
                        <tr>
                          <td style="color: #71717a; font-size: 14px; width: 100px;">Project:</td>
                          <td style="color: #fafafa; font-size: 14px;">${dto.project}</td>
                        </tr>
                        <tr>
                          <td style="color: #71717a; font-size: 14px;">Environment:</td>
                          <td style="color: #fafafa; font-size: 14px;">${dto.environment}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Action Button -->
                  <tr>
                    <td style="padding: 20px 30px 30px;">
                      <a href="${dto.alertUrl}" style="display: inline-block; background-color: ${color}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                        View Alert Details →
                      </a>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 30px; border-top: 1px solid #27272a; text-align: center;">
                      <p style="margin: 0; color: #52525b; font-size: 12px;">
                        This email was sent by SignalCraft alert management system.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
    }

    private generateEscalationEmailHtml(params: {
        alertTitle: string;
        alertMessage: string;
        severity: string;
        escalationLevel: number;
        alertUrl: string;
    }): string {
        return `
      <!DOCTYPE html>
      <html>
        <body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #09090b;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #7f1d1d; border-radius: 12px; border: 2px solid #dc2626;">
                  <tr>
                    <td style="padding: 30px; text-align: center; border-bottom: 1px solid #991b1b;">
                      <div style="font-size: 48px; margin-bottom: 10px;">🚨</div>
                      <h1 style="margin: 0; color: #fef2f2; font-size: 28px;">ESCALATION ALERT</h1>
                      <p style="margin: 10px 0 0; color: #fca5a5; font-size: 16px; font-weight: 600;">
                        Level ${params.escalationLevel} - Action Required
                      </p>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 30px; background-color: #18181b;">
                      <h2 style="margin: 0 0 15px; color: #fafafa; font-size: 20px;">${params.alertTitle}</h2>
                      <p style="margin: 0; color: #d4d4d8; line-height: 1.6;">${params.alertMessage}</p>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 20px 30px; background-color: #18181b; text-align: center;">
                      <a href="${params.alertUrl}" style="display: inline-block; background-color: #dc2626; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">
                        ACT NOW →
                      </a>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 20px 30px; text-align: center; border-top: 1px solid #991b1b;">
                      <p style="margin: 0; color: #fca5a5; font-size: 12px; font-weight: 600;">
                        ⚠️ This alert was escalated due to lack of acknowledgment
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
    }
}
