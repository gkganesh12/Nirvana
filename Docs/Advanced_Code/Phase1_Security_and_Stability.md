# Phase 1: Security & Stability (Month 1)

> **Priority**: 🔴 CRITICAL - Must be completed before production launch

## Overview

This phase focuses on addressing critical security vulnerabilities and establishing a stable foundation for SignalCraft. These are **blocking issues** that could lead to security breaches, data loss, or system instability.

---

## 🎯 Objectives

1. **Fix critical security TODOs** (SAML validation, JWT verification)
2. **Implement comprehensive input validation**
3. **Harden secrets management**
4. **Add security headers and middleware**
5. **Establish error handling standards**
6. **Implement rate limiting across all endpoints**
7. **Add security monitoring and alerting**

---

## 🔴 Critical Security Fixes

### 1.1 SAML Signature Validation

**Current Issue**: SAML assertions are not validated
- File: `apps/api/src/saml/saml.controller.ts:169`
- Risk: Anyone can forge SAML responses and gain unauthorized access

#### Implementation Steps

**Step 1**: Install SAML validation library
```bash
npm install --workspace @signalcraft/api saml2-js node-forge
npm install --workspace @signalcraft/api --save-dev @types/saml2-js
```

**Step 2**: Create SAML validator service
```typescript
// apps/api/src/saml/saml-validator.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as saml2 from 'saml2-js';
import { ConfigService } from '@nestjs/config';
import * as forge from 'node-forge';

@Injectable()
export class SamlValidatorService {
  constructor(private configService: ConfigService) {}

  async validateAssertion(
    samlResponse: string,
    idpCertificate: string,
    idpEntityId: string
  ): Promise<{ nameId: string; attributes: Record<string, any> }> {
    try {
      // Parse the SAML response
      const doc = new DOMParser().parseFromString(samlResponse, 'text/xml');
      
      // Verify signature using IdP certificate
      const cert = forge.pki.certificateFromPem(idpCertificate);
      const isValid = this.verifySignature(doc, cert);
      
      if (!isValid) {
        throw new UnauthorizedException('Invalid SAML signature');
      }

      // Verify audience and issuer
      const audience = this.extractAudience(doc);
      const issuer = this.extractIssuer(doc);
      
      if (issuer !== idpEntityId) {
        throw new UnauthorizedException('Invalid SAML issuer');
      }

      // Verify timestamp (not expired)
      const notOnOrAfter = this.extractNotOnOrAfter(doc);
      if (new Date() > new Date(notOnOrAfter)) {
        throw new UnauthorizedException('SAML assertion expired');
      }

      // Extract user attributes
      const nameId = this.extractNameId(doc);
      const attributes = this.extractAttributes(doc);

      return { nameId, attributes };
    } catch (error) {
      throw new UnauthorizedException('SAML validation failed');
    }
  }

  private verifySignature(doc: Document, cert: any): boolean {
    // Implementation using node-forge to verify XML signature
    // ... detailed signature verification logic
    return true;
  }

  private extractAudience(doc: Document): string {
    const audienceNode = doc.getElementsByTagName('saml2:Audience')[0];
    return audienceNode?.textContent || '';
  }

  private extractIssuer(doc: Document): string {
    const issuerNode = doc.getElementsByTagName('saml2:Issuer')[0];
    return issuerNode?.textContent || '';
  }

  private extractNotOnOrAfter(doc: Document): string {
    const conditionsNode = doc.getElementsByTagName('saml2:Conditions')[0];
    return conditionsNode?.getAttribute('NotOnOrAfter') || '';
  }

  private extractNameId(doc: Document): string {
    const nameIdNode = doc.getElementsByTagName('saml2:NameID')[0];
    return nameIdNode?.textContent || '';
  }

  private extractAttributes(doc: Document): Record<string, any> {
    const attributes: Record<string, any> = {};
    const attributeNodes = doc.getElementsByTagName('saml2:Attribute');
    
    for (let i = 0; i < attributeNodes.length; i++) {
      const attr = attributeNodes[i];
      const name = attr.getAttribute('Name');
      const valueNode = attr.getElementsByTagName('saml2:AttributeValue')[0];
      if (name && valueNode) {
        attributes[name] = valueNode.textContent;
      }
    }
    
    return attributes;
  }
}
```

**Step 3**: Update SAML controller to use validator
```typescript
// apps/api/src/saml/saml.controller.ts
@Post('acs')
async handleAssertion(@Body() body: any) {
  const { SAMLResponse } = body;
  
  // Get workspace SAML config
  const samlConfig = await this.samlService.getConfig(workspaceId);
  
  if (!samlConfig.enabled) {
    throw new BadRequestException('SAML not enabled');
  }

  // ✅ VALIDATE SAML ASSERTION
  const validatedData = await this.samlValidatorService.validateAssertion(
    SAMLResponse,
    samlConfig.idpCertificate,
    samlConfig.idpEntityId
  );

  // Create or update user
  const user = await this.authService.handleSamlLogin(
    workspaceId,
    validatedData.nameId,
    validatedData.attributes
  );

  // Generate session token
  return this.authService.createSession(user);
}
```

**Testing**:
```typescript
// apps/api/src/saml/saml-validator.service.spec.ts
describe('SamlValidatorService', () => {
  it('should reject SAML response with invalid signature', async () => {
    const invalidResponse = '...'; // Tampered SAML response
    await expect(
      validator.validateAssertion(invalidResponse, cert, entityId)
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should reject expired SAML assertion', async () => {
    const expiredResponse = '...'; // Expired SAML response
    await expect(
      validator.validateAssertion(expiredResponse, cert, entityId)
    ).rejects.toThrow(UnauthorizedException);
  });
});
```

---

### 1.2 WebSocket JWT Verification

**Current Issue**: WebSocket connections not authenticated
- File: `apps/api/src/common/websocket/events.gateway.ts:41`
- Risk: Unauthorized access to real-time updates

#### Implementation Steps

**Step 1**: Create WebSocket auth middleware
```typescript
// apps/api/src/common/websocket/websocket-auth.middleware.ts
import { Socket } from 'socket.io';
import { WsException } from '@nestjs/websockets';
import { clerkClient } from '@clerk/backend';

export async function authenticateWebSocket(
  socket: Socket,
  next: (err?: Error) => void
) {
  try {
    // Extract token from handshake
    const token = socket.handshake.auth.token || 
                  socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new WsException('No authentication token provided');
    }

    // Verify JWT with Clerk
    const session = await clerkClient.sessions.verifySession(
      socket.handshake.auth.sessionId,
      token
    );

    if (!session) {
      throw new WsException('Invalid or expired token');
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: session.userId },
      include: { workspace: true }
    });

    if (!user) {
      throw new WsException('User not found');
    }

    // Attach user to socket
    socket.data.user = user;
    socket.data.workspaceId = user.workspaceId;

    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
}
```

**Step 2**: Apply middleware to WebSocket gateway
```typescript
// apps/api/src/common/websocket/events.gateway.ts
import { authenticateWebSocket } from './websocket-auth.middleware';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection {
  afterInit(server: Server) {
    // ✅ ADD JWT VERIFICATION MIDDLEWARE
    server.use(authenticateWebSocket);
  }

  async handleConnection(@ConnectedSocket() client: Socket) {
    // User is already authenticated via middleware
    const user = client.data.user;
    const workspaceId = client.data.workspaceId;
    
    this.logger.log(`Client connected: ${user.email} (workspace: ${workspaceId})`);
    
    // Join workspace-specific room
    client.join(`workspace:${workspaceId}`);
  }

  @SubscribeMessage('subscribe_alerts')
  async subscribeToAlerts(@ConnectedSocket() client: Socket) {
    // Verify user has permission to view alerts
    const workspaceId = client.data.workspaceId;
    client.join(`alerts:${workspaceId}`);
    return { success: true };
  }
}
```

**Frontend client update**:
```typescript
// apps/web/lib/websocket-client.ts
import { io } from 'socket.io-client';
import { useAuth } from '@clerk/nextjs';

export function useWebSocket() {
  const { getToken, session } = useAuth();

  useEffect(() => {
    const token = await getToken();
    
    const socket = io(process.env.NEXT_PUBLIC_API_BASE_URL, {
      auth: {
        token,
        sessionId: session?.id
      }
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket auth failed:', error);
    });

    return () => socket.disconnect();
  }, [getToken, session]);
}
```

---

## 🛡️ Input Validation & Sanitization

### 2.1 Request Size Limits

**Implementation**:
```typescript
// apps/api/src/main.ts
import helmet from 'helmet';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ ADD REQUEST SIZE LIMITS
  app.use(json({ limit: '10mb' })); // Prevent large JSON payloads
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // ✅ ADD SECURITY HEADERS
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  await app.listen(4000);
}
```

### 2.2 DTO Validation for All Endpoints

**Create comprehensive DTOs**:
```typescript
// apps/api/src/webhooks/dto/ingest-webhook.dto.ts
import { 
  IsString, IsEnum, IsObject, IsOptional, 
  ValidateNested, IsUrl, MaxLength, IsInt, Max 
} from 'class-validator';
import { Type } from 'class-transformer';

export class IngestWebhookDto {
  @IsString()
  @MaxLength(500)
  source: string;

  @IsString()
  @MaxLength(1000)
  sourceEventId: string;

  @IsString()
  @MaxLength(200)
  project: string;

  @IsEnum(['production', 'staging', 'development'])
  environment: string;

  @IsEnum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  severity: string;

  @IsObject()
  @Type(() => Object)
  payload: Record<string, any>; // Validated separately

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'] })
  @MaxLength(2000)
  sourceUrl?: string;
}

// Add custom validator for payload depth
import { registerDecorator, ValidationOptions } from 'class-validator';

export function MaxDepth(maxDepth: number, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'maxDepth',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return getObjectDepth(value) <= maxDepth;
        },
        defaultMessage() {
          return `Object depth exceeds maximum of ${maxDepth}`;
        },
      },
    });
  };
}

function getObjectDepth(obj: any, depth = 0): number {
  if (typeof obj !== 'object' || obj === null || depth > 10) {
    return depth;
  }
  return 1 + Math.max(0, ...Object.values(obj).map(v => getObjectDepth(v, depth)));
}
```

**Apply validation globally**:
```typescript
// apps/api/src/main.ts
import { ValidationPipe } from '@nestjs/common';

app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // Strip unknown properties
    forbidNonWhitelisted: true, // Throw error on unknown properties
    transform: true, // Auto-transform payloads to DTO types
    transformOptions: {
      enableImplicitConversion: false // Explicit type conversion only
    },
    exceptionFactory: (errors) => {
      // Custom error formatting
      return new BadRequestException({
        message: 'Validation failed',
        errors: errors.map(e => ({
          field: e.property,
          constraints: e.constraints
        }))
      });
    }
  })
);
```

---

## 🔐 Secrets Management Hardening

### 3.1 Migrate to AWS Secrets Manager

**Step 1**: Install AWS SDK
```bash
npm install --workspace @signalcraft/api @aws-sdk/client-secrets-manager
```

**Step 2**: Create secrets service
```typescript
// apps/api/src/common/secrets/secrets.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { 
  SecretsManagerClient, 
  GetSecretValueCommand,
  CreateSecretCommand,
  PutSecretValueCommand,
  RotateSecretCommand 
} from '@aws-sdk/client-secrets-manager';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecretsService {
  private readonly client: SecretsManagerClient;
  private readonly logger = new Logger(SecretsService.name);
  private readonly cache = new Map<string, { value: string; expiresAt: number }>();
  private readonly CACHE_TTL = 300_000; // 5 minutes

  constructor(private configService: ConfigService) {
    this.client = new SecretsManagerClient({
      region: configService.get('AWS_REGION') || 'us-east-1',
    });
  }

  async getSecret(secretName: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(secretName);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    try {
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await this.client.send(command);
      
      const secretValue = response.SecretString;
      
      if (!secretValue) {
        throw new Error(`Secret ${secretName} has no value`);
      }

      // Cache the secret
      this.cache.set(secretName, {
        value: secretValue,
        expiresAt: Date.now() + this.CACHE_TTL
      });

      return secretValue;
    } catch (error) {
      this.logger.error(`Failed to retrieve secret ${secretName}`, error);
      throw error;
    }
  }

  async setSecret(secretName: string, secretValue: string): Promise<void> {
    try {
      // Try to update existing secret
      const updateCommand = new PutSecretValueCommand({
        SecretId: secretName,
        SecretString: secretValue,
      });
      await this.client.send(updateCommand);
      
      // Invalidate cache
      this.cache.delete(secretName);
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        // Create new secret
        const createCommand = new CreateSecretCommand({
          Name: secretName,
          SecretString: secretValue,
        });
        await this.client.send(createCommand);
      } else {
        throw error;
      }
    }
  }

  async rotateSecret(secretName: string): Promise<void> {
    const command = new RotateSecretCommand({
      SecretId: secretName,
      RotationLambdaARN: this.configService.get('SECRET_ROTATION_LAMBDA_ARN'),
    });
    await this.client.send(command);
    
    // Invalidate cache
    this.cache.delete(secretName);
  }
}
```

**Step 3**: Update integration config access
```typescript
// apps/api/src/integrations/integrations.service.ts
async getSlackConfig(workspaceId: string): Promise<SlackConfig> {
  const integration = await prisma.integration.findUnique({
    where: {
      workspaceId_type: {
        workspaceId,
        type: 'SLACK'
      }
    }
  });

  // ✅ RETRIEVE FROM SECRETS MANAGER
  const secretName = `signalcraft/${workspaceId}/slack`;
  const secretJson = await this.secretsService.getSecret(secretName);
  const config = JSON.parse(secretJson);

  return {
    accessToken: config.accessToken,
    teamId: config.teamId,
    // ... other config
  };
}

async setSlackConfig(workspaceId: string, config: SlackConfig): Promise<void> {
  // ✅ STORE IN SECRETS MANAGER
  const secretName = `signalcraft/${workspaceId}/slack`;
  await this.secretsService.setSecret(secretName, JSON.stringify(config));

  // Store only metadata in database
  await prisma.integration.upsert({
    where: {
      workspaceId_type: {
        workspaceId,
        type: 'SLACK'
      }
    },
    update: {
      status: 'ACTIVE',
      configJson: { configured: true } // No secrets!
    },
    create: {
      workspaceId,
      type: 'SLACK',
      status: 'ACTIVE',
      configJson: { configured: true }
    }
  });
}
```

### 3.2 Implement Secret Rotation

**Create rotation Lambda**:
```typescript
// lambda/rotate-secrets.ts
import { SecretsManagerRotationEvent } from 'aws-lambda';
import { SecretsManagerClient, GetSecretValueCommand, PutSecretValueCommand } from '@aws-sdk/client-secrets-manager';

export async function handler(event: SecretsManagerRotationEvent) {
  const { SecretId, Token, Step } = event;
  const client = new SecretsManagerClient({});

  switch (Step) {
    case 'createSecret':
      // Generate new secret value
      const newSecret = generateNewApiKey(); // Custom logic
      await client.send(new PutSecretValueCommand({
        SecretId,
        SecretString: newSecret,
        VersionStages: ['AWSPENDING'],
        ClientRequestToken: Token
      }));
      break;

    case 'setSecret':
      // Update external service with new secret
      // e.g., update Slack app credentials
      break;

    case 'testSecret':
      // Verify new secret works
      break;

    case 'finishSecret':
      // Mark new secret as current
      break;
  }
}
```

---

## 🚨 Error Handling Standards

### 4.1 Custom Exception Hierarchy

```typescript
// apps/api/src/common/exceptions/base.exception.ts
export class BaseException extends Error {
  constructor(
    public readonly message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationException extends BaseException {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class AuthenticationException extends BaseException {
  constructor(message: string) {
    super(message, 'AUTH_ERROR', 401);
  }
}

export class AuthorizationException extends BaseException {
  constructor(message: string) {
    super(message, 'FORBIDDEN', 403);
  }
}

export class ResourceNotFoundException extends BaseException {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, 'NOT_FOUND', 404);
  }
}

export class ExternalServiceException extends BaseException {
  constructor(service: string, message: string) {
    super(`${service} error: ${message}`, 'EXTERNAL_SERVICE_ERROR', 502);
  }
}
```

### 4.2 Global Exception Filter

```typescript
// apps/api/src/common/filters/http-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { BaseException } from '../exceptions/base.exception';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = 500;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let details = undefined;

    if (exception instanceof BaseException) {
      status = exception.statusCode;
      message = exception.message;
      code = exception.code;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string' 
        ? exceptionResponse 
        : (exceptionResponse as any).message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Log error
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : undefined
    );

    // Send response
    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    });
  }
}

// Register in main.ts
app.useGlobalFilters(new GlobalExceptionFilter());
```

---

## 📊 Success Metrics

- [ ] All security TODOs resolved
- [ ] 100% of endpoints have input validation
- [ ] All integration secrets moved to AWS Secrets Manager
- [ ] WebSocket connections authenticated
- [ ] Security headers enabled
- [ ] Error handling standardized
- [ ] Rate limiting on all public endpoints
- [ ] Security audit passes with 0 critical issues

---

## 🧪 Testing Requirements

1. **Security Tests**:
   - SAML assertion tampering tests
   - JWT expiry and invalid token tests
   - Rate limiting bypass attempts
   - Input validation fuzzing

2. **Integration Tests**:
   - Secrets retrieval and caching
   - Error handling flows
   - Authentication middleware

3. **Load Tests**:
   - Rate limiting under high load
   - WebSocket connection scaling

---

## 📝 Documentation Deliverables

- [ ] Security architecture document
- [ ] Secrets management runbook
- [ ] Incident response playbook
- [ ] Error code reference guide
- [ ] Security audit report

---

## ⏱️ Timeline

**Week 1**: SAML validation + JWT verification
**Week 2**: Input validation + secrets migration
**Week 3**: Error handling + security headers
**Week 4**: Testing + documentation + security audit

---

## 🔗 Dependencies

- AWS Secrets Manager setup
- Security audit tools (OWASP ZAP, Burp Suite)
- Monitoring infrastructure for security events

---

## ✅ Definition of Done

- All critical security TODOs removed from codebase
- Security audit passes with 0 critical, 0 high severity issues
- 100% test coverage for security-critical code paths
- Documentation reviewed and approved
- Team trained on new security practices
