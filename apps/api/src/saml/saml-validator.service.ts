import { Injectable, Logger } from '@nestjs/common';
import { DOMParser } from '@xmldom/xmldom';
import * as crypto from 'crypto';
import { AuthenticationException, ValidationException } from '../common/exceptions/base.exception';

interface SamlValidationResult {
    isValid: boolean;
    nameId: string;
    email: string;
    attributes: Record<string, unknown>;
}

@Injectable()
export class SamlValidatorService {
    private readonly logger = new Logger(SamlValidatorService.name);

    /**
     * Validate SAML assertion signature and extract user information
     * @param samlResponse Base64-encoded SAML response from IdP
     * @param idpCertificate IdP X.509 certificate in PEM format
     * @param idpEntityId Expected IdP entity ID
     * @returns Validated user information
     * @throws AuthenticationException if validation fails
     */
    async validateAssertion(
        samlResponse: string,
        idpCertificate: string,
        idpEntityId: string,
    ): Promise<SamlValidationResult> {
        if (!samlResponse) {
            throw new ValidationException('SAML response is empty');
        }

        try {
            // Decode base64 SAML response
            const decodedResponse = Buffer.from(samlResponse, 'base64').toString('utf-8');

            // Parse XML
            const doc = new DOMParser().parseFromString(decodedResponse, 'text/xml');

            if (!doc) {
                throw new AuthenticationException('Invalid SAML XML');
            }

            // 1. Verify signature
            const signatureValid = this.verifySignature(doc, idpCertificate);
            if (!signatureValid) {
                this.logger.error('SAML signature validation failed');
                throw new AuthenticationException('Invalid SAML signature');
            }

            // 2. Verify issuer matches expected IdP
            const issuer = this.extractIssuer(doc);
            if (issuer !== idpEntityId) {
                this.logger.error(`Issuer mismatch: expected ${idpEntityId}, got ${issuer}`);
                throw new AuthenticationException('Invalid SAML issuer');
            }

            // 3. Verify timestamp (not expired)
            this.verifyTimestamp(doc);

            // 4. Extract user information
            const nameId = this.extractNameId(doc);
            const email = this.extractEmail(doc);
            const attributes = this.extractAttributes(doc);

            this.logger.log(`SAML assertion validated successfully for ${email}`);

            return {
                isValid: true,
                nameId,
                email,
                attributes,
            };
        } catch (error) {
            if (error instanceof AuthenticationException) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`SAML validation error: ${errorMessage}`);
            throw new AuthenticationException('SAML validation failed', { originalError: errorMessage });
        }
    }

    /**
     * Verify XML signature using IdP certificate
     */
    private verifySignature(doc: Document, idpCertificate: string): boolean {
        try {
            // Extract signature element
            const signatureElements = doc.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature');

            if (signatureElements.length === 0) {
                this.logger.error('No signature found in SAML response');
                return false;
            }

            const signatureElement = signatureElements[0];

            // Extract signature value
            const signatureValueElements = signatureElement.getElementsByTagNameNS(
                'http://www.w3.org/2000/09/xmldsig#',
                'SignatureValue'
            );

            if (signatureValueElements.length === 0) {
                return false;
            }

            const signatureValue = signatureValueElements[0].textContent?.trim();
            if (!signatureValue) {
                return false;
            }

            // Extract signed info (canonicalized)
            const signedInfoElements = signatureElement.getElementsByTagNameNS(
                'http://www.w3.org/2000/09/xmldsig#',
                'SignedInfo'
            );

            if (signedInfoElements.length === 0) {
                return false;
            }

            const signedInfo = signedInfoElements[0];
            const canonicalizedSignedInfo = this.canonicalizeXml(signedInfo);

            // Prepare certificate (remove PEM headers/footers and newlines)
            const cleanCert = idpCertificate
                .replace(/-----BEGIN CERTIFICATE-----/g, '')
                .replace(/-----END CERTIFICATE-----/g, '')
                .replace(/\n/g, '')
                .replace(/\r/g, '');

            // Create public key from certificate
            const publicKey = `-----BEGIN CERTIFICATE-----\n${cleanCert}\n-----END CERTIFICATE-----`;

            // Verify signature
            const verify = crypto.createVerify('RSA-SHA256');
            verify.update(canonicalizedSignedInfo);
            const isValid = verify.verify(publicKey, signatureValue, 'base64');

            return isValid;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Signature verification error: ${errorMessage}`);
            return false;
        }
    }

    /**
     * Canonicalize XML for signature verification (simplified C14N)
     */
    private canonicalizeXml(element: Element): string {
        // Simplified canonicalization - in production, use proper C14N library
        const serializer = new (require('@xmldom/xmldom').XMLSerializer)();
        let xml = serializer.serializeToString(element);

        // Basic normalization
        xml = xml.replace(/\s+/g, ' '); // Normalize whitespace
        xml = xml.replace(/>\s+</g, '><'); // Remove whitespace between tags

        return xml.trim();
    }

    /**
     * Extract issuer from SAML response
     */
    private extractIssuer(doc: Document): string {
        const issuerElements = doc.getElementsByTagNameNS('urn:oasis:names:tc:SAML:2.0:assertion', 'Issuer');

        if (issuerElements.length === 0) {
            throw new AuthenticationException('Missing SAML Issuer');
        }

        const issuer = issuerElements[0].textContent?.trim();

        if (!issuer) {
            throw new AuthenticationException('Empty SAML Issuer');
        }

        return issuer;
    }

    /**
     * Verify SAML assertion timestamp validity
     */
    private verifyTimestamp(doc: Document): void {
        const conditionsElements = doc.getElementsByTagNameNS(
            'urn:oasis:names:tc:SAML:2.0:assertion',
            'Conditions'
        );

        if (conditionsElements.length === 0) {
            throw new AuthenticationException('Missing SAML Conditions');
        }

        const conditions = conditionsElements[0];
        const notBefore = conditions.getAttribute('NotBefore');
        const notOnOrAfter = conditions.getAttribute('NotOnOrAfter');

        const now = new Date();

        if (notBefore) {
            const notBeforeDate = new Date(notBefore);
            if (now < notBeforeDate) {
                throw new AuthenticationException('SAML assertion not yet valid');
            }
        }

        if (notOnOrAfter) {
            const notOnOrAfterDate = new Date(notOnOrAfter);
            if (now >= notOnOrAfterDate) {
                throw new AuthenticationException('SAML assertion expired');
            }
        }

        // Check for valid time window (e.g., assertion must be recent)
        if (notBefore) {
            const notBeforeDate = new Date(notBefore);
            const ageMinutes = (now.getTime() - notBeforeDate.getTime()) / (1000 * 60);

            // Reject assertions older than 5 minutes
            if (ageMinutes > 5) {
                this.logger.warn(`SAML assertion is ${ageMinutes.toFixed(1)} minutes old`);
                throw new AuthenticationException('SAML assertion too old');
            }
        }
    }

    /**
     * Extract NameID from SAML assertion
     */
    private extractNameId(doc: Document): string {
        const nameIdElements = doc.getElementsByTagNameNS(
            'urn:oasis:names:tc:SAML:2.0:assertion',
            'NameID'
        );

        if (nameIdElements.length === 0) {
            throw new AuthenticationException('Missing SAML NameID');
        }

        const nameId = nameIdElements[0].textContent?.trim();

        if (!nameId) {
            throw new AuthenticationException('Empty SAML NameID');
        }

        return nameId;
    }

    /**
     * Extract email from SAML assertion
     * Tries NameID first, then looks for email attribute
     */
    private extractEmail(doc: Document): string {
        // Try NameID first
        const nameId = this.extractNameId(doc);

        // If NameID is email format, use it
        if (nameId.includes('@')) {
            return nameId;
        }

        // Otherwise, look for email in attributes
        const attributes = this.extractAttributes(doc);

        const emailCandidates = [
            attributes['email'],
            attributes['emailAddress'],
            attributes['mail'],
            attributes['Email'],
            attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
        ];

        for (const email of emailCandidates) {
            if (email && typeof email === 'string' && email.includes('@')) {
                return email;
            }
        }

        throw new AuthenticationException('Could not extract email from SAML assertion');
    }

    /**
     * Extract all attributes from SAML assertion
     */
    private extractAttributes(doc: Document): Record<string, unknown> {
        const attributes: Record<string, unknown> = {};

        const attributeElements = doc.getElementsByTagNameNS(
            'urn:oasis:names:tc:SAML:2.0:assertion',
            'Attribute'
        );

        for (let i = 0; i < attributeElements.length; i++) {
            const attr = attributeElements[i];
            const name = attr.getAttribute('Name');

            if (!name) continue;

            const valueElements = attr.getElementsByTagNameNS(
                'urn:oasis:names:tc:SAML:2.0:assertion',
                'AttributeValue'
            );

            if (valueElements.length > 0) {
                const values = [];
                for (let j = 0; j < valueElements.length; j++) {
                    const value = valueElements[j].textContent?.trim();
                    if (value) {
                        values.push(value);
                    }
                }

                // If single value, store as string; if multiple, store as array
                attributes[name] = values.length === 1 ? values[0] : values;
            }
        }

        return attributes;
    }

    /**
     * Verify audience restriction (optional but recommended)
     */
    private verifyAudience(doc: Document, expectedAudience: string): void {
        const audienceElements = doc.getElementsByTagNameNS(
            'urn:oasis:names:tc:SAML:2.0:assertion',
            'Audience'
        );

        if (audienceElements.length === 0) {
            // Audience restriction is optional in SAML spec
            this.logger.warn('No audience restriction in SAML assertion');
            return;
        }

        let audienceMatch = false;
        for (let i = 0; i < audienceElements.length; i++) {
            const audience = audienceElements[i].textContent?.trim();
            if (audience === expectedAudience) {
                audienceMatch = true;
                break;
            }
        }

        if (!audienceMatch) {
            throw new AuthenticationException('Audience restriction mismatch');
        }
    }
}
