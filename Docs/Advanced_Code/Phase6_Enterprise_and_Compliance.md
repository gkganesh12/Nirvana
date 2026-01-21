# Phase 6: Enterprise & Compliance (Months 7-9)

> **Priority**: 🔵 LOW-MEDIUM - Required for enterprise customers

## Overview

Implement enterprise-grade security, compliance certifications, and features needed to sell to larger organizations. This phase enables SignalCraft to compete for enterprise deals worth $50k+/year.

---

## 🎯 Objectives

1. **SOC 2 Type II compliance**
2. **GDPR compliance** & data residency
3. **Advanced SSO** (Okta, Azure AD native)
4. **Audit log export** to SIEM
5. **Custom SLAs** per customer
6. **IP whitelisting**
7. **Data encryption at rest**
8. **Penetration testing** & security audit
9. **99.9% uptime SLA**
10. **Multi-region deployment**

---

## 1. SOC 2 Compliance

### 1.1 Required Controls

**Organizational Controls**:
- [ ] Information security policy documented
- [ ] Risk assessment process
- [ ] Vendor management program
- [ ] Change management procedures
- [ ] Incident response plan

**Access Controls**:
- [ ] MFA enforced for all admin access
- [ ] Role-based access control (RBAC)
- [ ] Regular access reviews
- [ ] Password policies enforced
- [ ] Privileged access management

**System Monitoring**:
- [ ] Comprehensive logging implemented
- [ ] Log retention (minimum 1 year)
- [ ] Security monitoring & alerting
- [ ] Intrusion detection system (IDS)

### 1.2 Implementation

**Enhanced Audit Logging**:
```typescript
// apps/api/src/audit/enhanced-audit.service.ts
@Injectable()
export class EnhancedAuditService {
  async logSecurityEvent(event: {
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    ipAddress: string;
    userAgent: string;
    success: boolean;
    metadata?: any;
  }): Promise<void> {
    await prisma.auditLog.create({
      data: {
        ...event,
        timestamp: new Date(),
      },
    });

    // Also send to external SIEM
    await this.siemService.sendEvent(event);

    // Alert on suspicious activity
    if (this.isSuspicious(event)) {
      await this.alertSecurityTeam(event);
    }
  }

  private isSuspicious(event: any): boolean {
    const checks = [
      this.checkMultipleFailedLogins(event),
      this.checkUnusualGeoLocation(event),
      this.checkAfterHoursAccess(event),
      this.checkMassDataExport(event),
    ];

    return checks.some(check => check);
  }

  private async checkMultipleFailedLogins(event: any): Promise<boolean> {
    if (event.action !== 'LOGIN_FAILED') return false;

    const recentFailures = await prisma.auditLog.count({
      where: {
        userId: event.userId,
        action: 'LOGIN_FAILED',
        timestamp: {
          gte: new Date(Date.now() - 10 * 60 * 1000), // Last 10 minutes
        },
      },
    });

    return recentFailures >= 5;
  }
}
```

**Audit Log Export**:
```typescript
// apps/api/src/audit/siem-export.service.ts
@Injectable()
export class SiemExportService {
  async exportToSplunk(logs: AuditLog[]): Promise<void> {
    const events = logs.map(log => ({
      time: log.timestamp.getTime() / 1000,
      source: 'signalcraft',
      sourcetype: 'audit',
      event: {
        user_id: log.userId,
        action: log.action,
        resource: `${log.resourceType}:${log.resourceId}`,
        ip: log.ipAddress,
        success: log.metadata?.success,
      },
    }));

    await axios.post(
      `${this.configService.get('SPLUNK_HEC_URL')}/services/collector/event`,
      events,
      {
        headers: {
          Authorization: `Splunk ${this.configService.get('SPLUNK_HEC_TOKEN')}`,
        },
      }
    );
  }

  async exportToDatadog(logs: AuditLog[]): Promise<void> {
    const ddLogs = logs.map(log => ({
      ddsource: 'signalcraft',
      service: 'audit',
      hostname: os.hostname(),
      message: `${log.action} on ${log.resourceType}`,
      ddtags: [
        `user_id:${log.userId}`,
        `action:${log.action}`,
        `resource:${log.resourceType}`,
      ],
      ...log.metadata,
    }));

    await axios.post(
      'https://http-intake.logs.datadoghq.com/v1/input',
      ddLogs,
      {
        headers: {
          'DD-API-KEY': this.configService.get('DATADOG_API_KEY'),
        },
      }
    );
  }
}
```

---

## 2. GDPR Compliance

### 2.1 Data Subject Rights

**Right to Access**:
```typescript
// apps/api/src/gdpr/data-export.service.ts
@Injectable()
export class DataExportService {
  async exportUserData(userId: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        workspace: true,
        assignedAlertGroups: true,
        auditLogs: true,
        apiKeys: true,
      },
    });

    // Gather all personal data
    const personalData = {
      profile: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        createdAt: user.createdAt,
      },
      workspace: {
        id: user.workspace.id,
        name: user.workspace.name,
      },
      activity: {
        alertsAssigned: user.assignedAlertGroups.length,
        auditLogEntries: user.auditLogs.length,
      },
      apiKeys: user.apiKeys.map(key => ({
        name: key.name,
        prefix: key.prefix,
        lastUsedAt: key.lastUsedAt,
        createdAt: key.createdAt,
      })),
    };

    return personalData;
  }
}
```

**Right to Deletion ("Right to be Forgotten")**:
```typescript
// apps/api/src/gdpr/data-deletion.service.ts
@Injectable()
export class DataDeletionService {
  async deleteUserData(userId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Anonymize audit logs (required for compliance)
      await tx.auditLog.updateMany({
        where: { userId },
        data: {
          userId: 'DELETED_USER',
          metadata: { anonymized: true },
        },
      });

      // Delete API keys
      await tx.apiKey.deleteMany({ where: { createdBy: userId } });

      // Reassign or delete alerts
      await tx.alertGroup.updateMany({
        where: { assigneeUserId: userId },
        data: { assigneeUserId: null },
      });

      // Delete user
      await tx.user.delete({ where: { id: userId } });
    });
  }
}
```

### 2.2 Data Residency

**Multi-Region Support**:
```typescript
// apps/api/src/config/region.config.ts
export const REGIONS = {
  US: {
    code: 'us-east-1',
    database: process.env.DB_URL_US,
    storage: process.env.S3_BUCKET_US,
    redis: process.env.REDIS_URL_US,
  },
  EU: {
    code: 'eu-west-1',
    database: process.env.DB_URL_EU,
    storage: process.env.S3_BUCKET_EU,
    redis: process.env.REDIS_URL_EU,
  },
};

// Workspace specifies region
model Workspace {
  // ... existing fields
  dataRegion String @default("US") // US, EU, APAC
}
```

---

## 3. Advanced SSO

### 3.1 Okta Integration

```typescript
// apps/api/src/sso/okta.service.ts
import { Strategy as OktaStrategy } from '@okta/oidc-middleware';

@Injectable()
export class OktaService {
  async setupOktaSSO(workspaceId: string, config: {
    domain: string;
    clientId: string;
    clientSecret: string;
  }): Promise<void> {
    const strategy = new OktaStrategy(
      {
        issuer: `https://${config.domain}/oauth2/default`,
        clientID: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri: `${process.env.API_BASE_URL}/auth/okta/callback`,
        scope: ['openid', 'email', 'profile'],
      },
      async (accessToken, refreshToken, profile, done) => {
        const user = await this.findOrCreateUser(workspaceId, profile);
        done(null, user);
      }
    );

    // Store configuration
    await this.secretsService.setSecret(
      `workspace/${workspaceId}/okta`,
      JSON.stringify(config)
    );
  }
}
```

### 3.2 Azure AD Integration

```typescript
// apps/api/src/sso/azure-ad.service.ts
import { BearerStrategy } from 'passport-azure-ad';

@Injectable()
export class AzureAdService {
  async setupAzureAD(workspaceId: string, config: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
  }): Promise<void> {
    const strategy = new BearerStrategy(
      {
        identityMetadata: `https://login.microsoftonline.com/${config.tenantId}/v2.0/.well-known/openid-configuration`,
        clientID: config.clientId,
        issuer: `https://sts.windows.net/${config.tenantId}/`,
        audience: config.clientId,
      },
      async (token, done) => {
        const user = await this.findOrCreateUser(workspaceId, token);
        done(null, user);
      }
    );
  }
}
```

---

## 4. Encryption at Rest

### 4.1 Database Encryption

```typescript
// Enable encryption at rest in PostgreSQL
// AWS RDS: Enable encryption when creating instance
// Google Cloud SQL: Enable encryption by default
// Azure: Enable Transparent Data Encryption (TDE)

// Application-level field encryption for sensitive data
import { createCipher, createDecipher } from 'crypto';

@Injectable()
export class FieldEncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(configService: ConfigService) {
    this.key = Buffer.from(
      configService.get('FIELD_ENCRYPTION_KEY'),
      'hex'
    );
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(ciphertext: string): string {
    const [ivHex, authTagHex, encrypted] = ciphertext.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = createDecipheriv(this.algorithm, this.key, iv);
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

---

## 5. IP Whitelisting

```typescript
// apps/api/src/security/ip-whitelist.guard.ts
@Injectable()
export class IpWhitelistGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const clientIp = this.getClientIp(request);
    const workspaceId = request.user?.workspaceId;

    if (!workspaceId) return false;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { securitySettings: true },
    });

    if (!workspace.securitySettings?.ipWhitelistEnabled) {
      return true; // IP whitelisting not enabled
    }

    const allowedIps = workspace.securitySettings.allowedIps || [];
    
    return this.isIpAllowed(clientIp, allowedIps);
  }

  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection.remoteAddress
    );
  }

  private isIpAllowed(clientIp: string, allowedIps: string[]): boolean {
    return allowedIps.some(allowed => {
      if (allowed.includes('/')) {
        // CIDR notation
        return this.ipInCidr(clientIp, allowed);
      }
      return clientIp === allowed;
    });
  }
}

// Add to Prisma schema
model SecuritySettings {
  id                  String   @id @default(cuid())
  workspaceId         String   @unique
  ipWhitelistEnabled  Boolean  @default(false)
  allowedIps          String[]
  mfaEnforced         Boolean  @default(false)
  sessionTimeoutMins  Int      @default(480) // 8 hours

  workspace Workspace @relation(fields: [workspaceId], references: [id])
}
```

---

## 6. High Availability & SLA

### 6.1 Multi-Region Deployment

```yaml
# infrastructure/docker-compose.prod.yml
version: '3.8'

services:
  api-us:
    image: signalcraft/api:latest
    environment:
      - REGION=US
      - DATABASE_URL=${DB_URL_US}
      - REDIS_URL=${REDIS_URL_US}
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
        max_attempts: 3
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:4000/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  api-eu:
    # Same configuration for EU region
```

### 6.2 Uptime Monitoring

```typescript
// apps/api/src/monitoring/uptime.service.ts
@Injectable()
export class UptimeMonitoringService {
  @Cron('*/1 * * * *') // Every minute
  async checkSystemHealth(): Promise<void> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkExternalAPIs(),
      this.checkDiskSpace(),
    ]);

    const failures = checks.filter(result => result.status === 'rejected');

    if (failures.length > 0) {
      await this.alertOps(failures);
      await this.updateStatusPage('degraded');
    } else {
      await this.updateStatusPage('operational');
    }

    // Record uptime metric
    await this.recordUptime(failures.length === 0);
  }

  private async recordUptime(isUp: boolean): Promise<void> {
    const now = new Date();
    await prisma.uptimeMetric.create({
      data: {
        timestamp: now,
        isUp,
        responseTimeMs: await this.measureResponseTime(),
      },
    });
  }

  async calculateSla(period: 'month' | 'quarter' | 'year'): Promise<number> {
    const start = this.getPeriodStart(period);
    
    const metrics = await prisma.uptimeMetric.findMany({
      where: {
        timestamp: { gte: start },
      },
    });

    const totalMinutes = metrics.length;
    const upMinutes = metrics.filter(m => m.isUp).length;

    return (upMinutes / totalMinutes) * 100;
  }
}
```

---

## 7. Penetration Testing

### 7.1 Security Audit Checklist

**Authentication & Authorization**:
- [ ] Test JWT expiration
- [ ] Test session hijacking prevention
- [ ] Test RBAC bypass attempts
- [ ] Test OAuth flow vulnerabilities
- [ ] Test password reset flow

**Input Validation**:
- [ ] SQL injection tests
- [ ] XSS attempts
- [ ] CSRF protection validation
- [ ] File upload vulnerabilities
- [ ] JSON payload size limits

**Infrastructure**:
- [ ] Port scanning
- [ ] SSL/TLS configuration
- [ ] DDoS resilience
- [ ] Rate limiting effectiveness
- [ ] Data encryption verification

### 7.2 Automated Security Scanning

```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM
  push:
    branches: [main]

jobs:
  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Snyk scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

  sast-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: p/security-audit p/nodejs

  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: TruffleHog scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
```

---

## 📊 Success Metrics

- [ ] SOC 2 Type II audit passed
- [ ] GDPR compliance verified
- [ ] 99.9% uptime achieved (3 months)
- [ ] Penetration test passed
- [ ] Zero critical security vulnerabilities
- [ ] Audit logs exported to SIEM
- [ ] Multi-region deployment live
- [ ] Enterprise SSO working (Okta + Azure AD)

---

##⏱️ Timeline

**Months 7-8**: SOC 2 prep + GDPR implementation
**Month 9**: Penetration testing + security hardening

---

## ✅ Definition of Done

- SOC 2 Type II certification obtained
- GDPR compliance documented
- Enterprise features deployed
- Security audit passed
- Customer data encryption verified
- 99.9% uptime SLA met
