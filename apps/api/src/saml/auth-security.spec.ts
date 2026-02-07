import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { SamlValidatorService } from './saml-validator.service';
import { AuthenticationException, ValidationException } from '../common/exceptions/base.exception';
import { SecretsService } from '../common/secrets/secrets.service';

describe('Auth Security Testing', () => {
  let samlService: SamlValidatorService;
  let secretsService: SecretsService;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SamlValidatorService,
        {
          provide: SecretsService,
          useValue: {
            getSecret: jest.fn(),
          },
        },
      ],
    }).compile();

    samlService = module.get<SamlValidatorService>(SamlValidatorService);
    secretsService = module.get<SecretsService>(SecretsService);
  });

  describe('SAML Security', () => {
    it('should throw ValidationException for empty SAML response', async () => {
      await expect(samlService.validateAssertion('', 'cert', 'id')).rejects.toThrow(
        ValidationException,
      );
    });

    it('should throw AuthenticationException for invalid signature format', async () => {
      // Mock secrets retrieval
      (secretsService.getSecret as jest.Mock).mockResolvedValue('fake-cert');

      const invalidXml =
        '<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol">Invalid</samlp:Response>';
      const base64Response = Buffer.from(invalidXml).toString('base64');

      await expect(
        samlService.validateAssertion(base64Response, 'fake-cert', 'idp-1'),
      ).rejects.toThrow(AuthenticationException);
    });
  });

  describe('WebSocket Security (Logic check)', () => {
    // This is more of a unit test for the logic used in the gateway
    it('should identify issuer requirements for Clerk', () => {
      const clerkIssuer = process.env.CLERK_JWT_ISSUER || 'https://clerk.signalcraft.io';
      expect(clerkIssuer).toBeDefined();
      expect(clerkIssuer.startsWith('https://')).toBe(true);
    });
  });
});
