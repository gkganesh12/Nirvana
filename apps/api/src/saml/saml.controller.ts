import {
    Controller,
    Get,
    Put,
    Post,
    Body,
    Param,
    Req,
    Res,
    UseGuards,
    Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { SamlService, SamlConfigDto } from './saml.service';
import { SamlValidatorService } from './saml-validator.service';
import {
    ResourceNotFoundException,
    ValidationException,
    ConfigurationException,
    InternalServerException,
} from '../common/exceptions/base.exception';

interface AuthenticatedRequest extends Request {
    auth?: {
        userId?: string;
        workspaceId?: string;
    };
}

@Controller('api/saml')
export class SamlController {
    private readonly logger = new Logger(SamlController.name);

    constructor(
        private readonly samlService: SamlService,
        private readonly samlValidator: SamlValidatorService,
    ) { }

    /**
     * Get SAML configuration for the authenticated user's workspace
     */
    @Get('config')
    @UseGuards(ClerkAuthGuard)
    async getConfig(@Req() req: AuthenticatedRequest) {
        const workspaceId = req.auth?.workspaceId;
        if (!workspaceId) {
            throw new ResourceNotFoundException('Workspace');
        }

        const config = await this.samlService.getSamlConfig(workspaceId);
        if (!config) {
            // Return default empty config if none exists
            return {
                enabled: false,
                enforced: false,
                idpEntityId: null,
                idpSsoUrl: null,
                idpCertificate: null,
                spEntityId: null,
                allowedDomains: [],
                jitProvisioning: true,
            };
        }

        // Don't expose full certificate in response for security
        return {
            enabled: config.enabled,
            enforced: config.enforced,
            idpEntityId: config.idpEntityId,
            idpSsoUrl: config.idpSsoUrl,
            hasCertificate: !!config.idpCertificate,
            spEntityId: config.spEntityId,
            allowedDomains: config.allowedDomains,
            jitProvisioning: config.jitProvisioning,
        };
    }

    /**
     * Update SAML configuration
     */
    @Put('config')
    @UseGuards(ClerkAuthGuard)
    async updateConfig(
        @Req() req: AuthenticatedRequest,
        @Body() body: SamlConfigDto,
    ) {
        const workspaceId = req.auth?.workspaceId;
        if (!workspaceId) {
            throw new ResourceNotFoundException('Workspace');
        }

        const config = await this.samlService.upsertSamlConfig(workspaceId, body);
        this.logger.log(`SAML config updated for workspace ${workspaceId}`);

        return {
            success: true,
            enabled: config.enabled,
            enforced: config.enforced,
            spEntityId: config.spEntityId,
        };
    }

    /**
     * Get Service Provider metadata (public endpoint for IdP configuration)
     */
    @Get('metadata/:workspaceId')
    async getSpMetadata(
        @Param('workspaceId') workspaceId: string,
        @Res() res: Response,
    ) {
        try {
            const metadata = await this.samlService.generateSpMetadata(workspaceId);
            res.setHeader('Content-Type', 'application/xml');
            res.send(metadata);
        } catch (error) {
            this.logger.error(`Failed to generate SP metadata: ${error}`);
            throw new ResourceNotFoundException('SAML configuration', workspaceId);
        }
    }

    /**
     * Initiate SAML login (redirect to IdP)
     */
    @Get('login/:workspaceId')
    async initiateLogin(
        @Param('workspaceId') workspaceId: string,
        @Res() res: Response,
    ) {
        const config = await this.samlService.getSamlConfig(workspaceId);
        if (!config || !config.enabled || !config.idpSsoUrl) {
            throw new ValidationException('SAML is not configured for this workspace');
        }

        // Build SAML AuthnRequest URL
        const baseUrl = process.env.API_BASE_URL || 'http://localhost:5050';
        const acsUrl = `${baseUrl}/api/saml/acs`;
        const spEntityId = config.spEntityId;

        // Simple redirect to IdP with relay state
        // In production, you would generate a proper SAML AuthnRequest
        const relayState = Buffer.from(JSON.stringify({ workspaceId })).toString('base64');
        const samlRequestUrl = `${config.idpSsoUrl}?RelayState=${encodeURIComponent(relayState)}`;

        this.logger.log(`Initiating SAML login for workspace ${workspaceId}`);
        res.redirect(samlRequestUrl);
    }

    /**
     * SAML Assertion Consumer Service (ACS) - receives POST from IdP
     */
    @Post('acs')
    async handleAssertion(
        @Body() body: { SAMLResponse?: string; RelayState?: string },
        @Res() res: Response,
    ) {
        try {
            const { SAMLResponse, RelayState } = body;

            if (!SAMLResponse) {
                throw new ValidationException('Missing SAMLResponse');
            }

            // Decode RelayState to get workspaceId
            let workspaceId: string;
            try {
                const relayData = JSON.parse(Buffer.from(RelayState || '', 'base64').toString());
                workspaceId = relayData.workspaceId;
            } catch {
                throw new ValidationException('Invalid RelayState');
            }

            // Get workspace SAML configuration
            const config = await this.samlService.getSamlConfig(workspaceId);

            if (!config || !config.enabled) {
                throw new ValidationException('SAML not enabled for this workspace');
            }

            if (!config.idpCertificate || !config.idpEntityId) {
                throw new ConfigurationException('SAML not properly configured', 'idpCertificate');
            }

            // ✅ VALIDATE SAML ASSERTION using cryptographic signature verification
            const validatedData = await this.samlValidator.validateAssertion(
                SAMLResponse,
                config.idpCertificate,
                config.idpEntityId,
            );

            const { email, nameId, attributes } = validatedData;

            // Provision or get user with validated SAML data
            const user = await this.samlService.provisionUser(workspaceId, {
                nameId,
                email,
                attributes,
            });

            this.logger.log(`SAML authentication successful for ${email}`);

            // Redirect to frontend with session token
            // In production, you would create a proper session/JWT here
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            res.redirect(`${frontendUrl}/dashboard?saml_login=success&user=${user.id}`);
        } catch (error) {
            if (error instanceof ValidationException ||
                error instanceof ConfigurationException ||
                error instanceof ResourceNotFoundException) {
                throw error;
            }

            this.logger.error(`SAML ACS error: ${error}`);
            throw new InternalServerException('Failed to process SAML assertion', { error });
        }
    }

    /**
     * Check if SAML is required for an email
     */
    @Post('check-domain')
    async checkDomain(@Body() body: { email: string }) {
        if (!body.email) {
            throw new ValidationException('Email is required');
        }
        const result = await this.samlService.isSamlRequired(body.email);
        return result;
    }
}
