import { Injectable, Logger, ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { prisma, WorkspaceRole, InvitationStatus } from '@signalcraft/database';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import * as crypto from 'crypto';
import { EmailNotificationService } from '../notifications/email-notification.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class InvitationsService {
    private readonly logger = new Logger(InvitationsService.name);

    constructor(
        private readonly emailService: EmailNotificationService,
        private readonly auditService: AuditService,
    ) { }

    /**
     * Create a new invitation for a workspace
     */
    async createInvitation(
        workspaceId: string,
        inviterId: string,
        dto: CreateInvitationDto,
    ) {
        // Check if user is already in workspace
        const existingMember = await prisma.user.findFirst({
            where: {
                workspaceId,
                email: dto.email,
            },
        });

        if (existingMember) {
            throw new ConflictException('User is already a member of this workspace');
        }

        // Check if there's a pending invitation
        const pendingInvite = await prisma.invitation.findFirst({
            where: {
                workspaceId,
                email: dto.email,
                status: InvitationStatus.PENDING,
                expiresAt: { gt: new Date() },
            },
        });

        if (pendingInvite) {
            throw new ConflictException('A pending invitation already exists for this email');
        }

        // Generate secure token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        const invitation = await prisma.invitation.create({
            data: {
                workspaceId,
                email: dto.email,
                role: dto.role,
                token,
                inviterId,
                expiresAt,
            },
        });

        // Log action
        await this.auditService.log({
            workspaceId,
            userId: inviterId,
            action: 'INVITE_USER',
            resourceType: 'Invitation',
            resourceId: invitation.id,
            metadata: { email: dto.email, role: dto.role },
        });

        // Send email (stub for now, will enhance EmailNotificationService)
        try {
            await this.sendInvitationEmail(invitation);
        } catch (error) {
            this.logger.error(`Failed to send invitation email to ${dto.email}:`, error);
        }

        return invitation;
    }

    /**
     * Verify an invitation token
     */
    async verifyInvitation(token: string) {
        const invitation = await prisma.invitation.findUnique({
            where: { token },
            include: {
                workspace: {
                    select: { name: true },
                },
            },
        });

        if (!invitation || invitation.status !== InvitationStatus.PENDING) {
            throw new NotFoundException('Invitation not found or no longer active');
        }

        if (invitation.expiresAt < new Date()) {
            await prisma.invitation.update({
                where: { id: invitation.id },
                data: { status: InvitationStatus.EXPIRED },
            });
            throw new BadRequestException('Invitation has expired');
        }

        return invitation;
    }

    /**
     * Accept an invitation
     */
    async acceptInvitation(dto: AcceptInvitationDto, clerkUserId: string, email: string) {
        const invitation = await this.verifyInvitation(dto.token);

        if (invitation.email.toLowerCase() !== email.toLowerCase()) {
            throw new ForbiddenException('This invitation was sent to a different email address');
        }

        const workspaceId = invitation.workspaceId;

        // Use transaction to update invitation and create/update user
        return await prisma.$transaction(async (tx) => {
            // Update invitation status
            await tx.invitation.update({
                where: { id: invitation.id },
                data: {
                    status: InvitationStatus.ACCEPTED,
                    acceptedAt: new Date(),
                },
            });

            // Create or update user in the workspace
            const user = await tx.user.upsert({
                where: { clerkId: clerkUserId },
                update: {
                    workspaceId,
                    role: invitation.role,
                },
                create: {
                    clerkId: clerkUserId,
                    email: invitation.email,
                    workspaceId,
                    role: invitation.role,
                },
            });

            // Log action
            await this.auditService.log({
                workspaceId,
                userId: user.id,
                action: 'ACCEPT_INVITATION',
                resourceType: 'Invitation',
                resourceId: invitation.id,
            });

            return user;
        });
    }

    /**
     * Revoke a pending invitation
     */
    async revokeInvitation(workspaceId: string, invitationId: string, userId: string) {
        const invitation = await prisma.invitation.findFirst({
            where: {
                id: invitationId,
                workspaceId,
            },
        });

        if (!invitation) {
            throw new NotFoundException('Invitation not found');
        }

        if (invitation.status !== InvitationStatus.PENDING) {
            throw new BadRequestException('Only pending invitations can be revoked');
        }

        await prisma.invitation.update({
            where: { id: invitationId },
            data: {
                status: InvitationStatus.REVOKED,
                revokedAt: new Date(),
            },
        });

        // Log action
        await this.auditService.log({
            workspaceId,
            userId,
            action: 'REVOKE_INVITATION',
            resourceType: 'Invitation',
            resourceId: invitationId,
            metadata: { email: invitation.email },
        });
    }

    /**
     * List invitations for a workspace
     */
    async listInvitations(workspaceId: string) {
        return prisma.invitation.findMany({
            where: { workspaceId },
            orderBy: { createdAt: 'desc' },
        });
    }

    private async sendInvitationEmail(invitation: any) {
        // This will be calling EmailNotificationService.sendWorkspaceInvitation
        // For now, minimal implementation
        const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invite/accept?token=${invitation.token}`;

        // Mocking the call for now, will implement it in EmailNotificationService next
        this.logger.log(`Inviting ${invitation.email} to workspace ${invitation.workspaceId}. URL: ${inviteUrl}`);

        // await this.emailService.sendWorkspaceInvitation(
        //     invitation.workspaceId,
        //     invitation.email,
        //     invitation.workspace.name,
        //     inviteUrl
        // );
    }
}
