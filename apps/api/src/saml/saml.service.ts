import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { prisma, SamlConfig } from '@signalcraft/database';
import * as crypto from 'crypto';

export interface SamlConfigDto {
    enabled?: boolean;
    enforced?: boolean;
    idpEntityId?: string;
    idpSsoUrl?: string;
    idpCertificate?: string;
    allowedDomains?: string[];
    jitProvisioning?: boolean;
}

export interface SamlUser {
    nameId: string;
    email: string;
    attributes?: Record<string, any>;
    firstName?: string;
    lastName?: string;
    displayName?: string;
}

@Injectable()
export class SamlService {
    private readonly logger = new Logger(SamlService.name);

    /**
     * Get SAML configuration for a workspace
     */
    async getSamlConfig(workspaceId: string): Promise<SamlConfig | null> {
        return prisma.samlConfig.findUnique({
            where: { workspaceId },
        });
    }

    /**
     * Create or update SAML configuration
     */
    async upsertSamlConfig(workspaceId: string, config: SamlConfigDto): Promise<SamlConfig> {
        // Validate certificate if provided
        if (config.idpCertificate) {
            this.validateCertificate(config.idpCertificate);
        }

        // Generate SP Entity ID if not exists
        const existingConfig = await this.getSamlConfig(workspaceId);
        const spEntityId = existingConfig?.spEntityId || this.generateSpEntityId(workspaceId);

        return prisma.samlConfig.upsert({
            where: { workspaceId },
            create: {
                workspaceId,
                spEntityId,
                enabled: config.enabled ?? false,
                enforced: config.enforced ?? false,
                idpEntityId: config.idpEntityId,
                idpSsoUrl: config.idpSsoUrl,
                idpCertificate: config.idpCertificate,
                allowedDomains: config.allowedDomains ?? [],
                jitProvisioning: config.jitProvisioning ?? true,
            },
            update: {
                ...(config.enabled !== undefined && { enabled: config.enabled }),
                ...(config.enforced !== undefined && { enforced: config.enforced }),
                ...(config.idpEntityId !== undefined && { idpEntityId: config.idpEntityId }),
                ...(config.idpSsoUrl !== undefined && { idpSsoUrl: config.idpSsoUrl }),
                ...(config.idpCertificate !== undefined && { idpCertificate: config.idpCertificate }),
                ...(config.allowedDomains !== undefined && { allowedDomains: config.allowedDomains }),
                ...(config.jitProvisioning !== undefined && { jitProvisioning: config.jitProvisioning }),
            },
        });
    }

    /**
     * Generate Service Provider metadata XML
     */
    async generateSpMetadata(workspaceId: string): Promise<string> {
        const config = await this.getSamlConfig(workspaceId);
        if (!config) {
            throw new NotFoundException('SAML configuration not found');
        }

        const baseUrl = process.env.API_BASE_URL || 'http://localhost:5050';
        const spEntityId = config.spEntityId || this.generateSpEntityId(workspaceId);
        const acsUrl = `${baseUrl}/api/saml/acs`;

        return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     entityID="${spEntityId}">
  <md:SPSSODescriptor AuthnRequestsSigned="false"
                      WantAssertionsSigned="true"
                      protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                                 Location="${acsUrl}"
                                 index="1"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`;
    }

    /**
     * Check if SAML is required for an email domain
     */
    async isSamlRequired(email: string): Promise<{ required: boolean; workspaceId?: string }> {
        const domain = email.split('@')[1]?.toLowerCase();
        if (!domain) {
            return { required: false };
        }

        // Find workspace with SAML enforced for this domain
        const config = await prisma.samlConfig.findFirst({
            where: {
                enabled: true,
                enforced: true,
                allowedDomains: { has: domain },
            },
        });

        if (config) {
            return { required: true, workspaceId: config.workspaceId };
        }

        return { required: false };
    }

    /**
     * Provision or update user from SAML assertion (JIT provisioning)
     */
    async provisionUser(workspaceId: string, samlUser: SamlUser) {
        const config = await this.getSamlConfig(workspaceId);
        if (!config || !config.enabled) {
            throw new BadRequestException('SAML is not enabled for this workspace');
        }

        // Validate email domain
        const domain = samlUser.email.split('@')[1]?.toLowerCase();
        if (config.allowedDomains.length > 0 && !config.allowedDomains.includes(domain)) {
            throw new BadRequestException('Email domain not allowed for this workspace');
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email: samlUser.email },
        });

        if (existingUser) {
            // Update existing user if needed
            this.logger.log(`SAML login for existing user: ${samlUser.email}`);
            return existingUser;
        }

        // JIT provisioning
        if (!config.jitProvisioning) {
            throw new BadRequestException('JIT provisioning is disabled. Contact admin to create your account.');
        }

        const displayName = samlUser.displayName ||
            [samlUser.firstName, samlUser.lastName].filter(Boolean).join(' ') ||
            samlUser.email.split('@')[0];

        // Create new user with SAML-based clerkId (prefixed to distinguish from Clerk users)
        const samlClerkId = `saml_${crypto.randomBytes(16).toString('hex')}`;

        const newUser = await prisma.user.create({
            data: {
                workspaceId,
                clerkId: samlClerkId,
                email: samlUser.email,
                displayName,
                role: 'MEMBER',
            },
        });

        this.logger.log(`JIT provisioned new user via SAML: ${samlUser.email}`);
        return newUser;
    }

    /**
     * Validate IdP certificate format
     */
    private validateCertificate(cert: string): void {
        // Basic validation - check if it looks like a PEM certificate
        const trimmed = cert.trim();
        if (!trimmed.includes('-----BEGIN CERTIFICATE-----') ||
            !trimmed.includes('-----END CERTIFICATE-----')) {
            throw new BadRequestException('Invalid certificate format. Must be a PEM-encoded X.509 certificate.');
        }
    }

    /**
     * Generate unique SP Entity ID for workspace
     */
    private generateSpEntityId(workspaceId: string): string {
        const baseUrl = process.env.API_BASE_URL || 'http://localhost:5050';
        return `${baseUrl}/saml/${workspaceId}`;
    }
}
