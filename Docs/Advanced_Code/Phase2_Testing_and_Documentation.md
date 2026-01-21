# Phase 2: Testing & Documentation (Month 2)

> **Priority**: 🟡 HIGH - Essential for production confidence and developer productivity

## Overview

This phase establishes comprehensive testing coverage and documentation to ensure SignalCraft is reliable, maintainable, and developer-friendly. Without proper tests, production issues will leak through, eroding customer trust.

---

## 🎯 Objectives

1. **Achieve 80% code coverage** for critical paths
2. **Implement integration tests** for alert pipeline
3. **Add E2E tests** for critical user journeys
4. **Build frontend testing infrastructure**
5. **Generate API documentation** with Swagger
6. **Create comprehensive developer docs**
7. **Set up CI/CD pipelines** with automated testing

---

## 🧪 Testing Strategy

### Test Pyramid Breakdown

```
         /\
        /  \  E2E Tests (10%)
       /____\
      /      \  Integration Tests (30%)
     /________\
    /          \  Unit Tests (60%)
   /____________\
```

**Target Coverage**:
- Unit Tests: 60% of total tests
- Integration Tests: 30% of total tests
- E2E Tests: 10% of total tests
- Overall Code Coverage: 80%+

---

## 1. Backend Testing Infrastructure

### 1.1 Unit Tests Setup

**Install testing dependencies**:
```bash
npm install --workspace @signalcraft/api --save-dev \
  @nestjs/testing \
  jest \
  @types/jest \
  ts-jest \
  supertest \
  @types/supertest
```

**Jest configuration**:
```typescript
// apps/api/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
};
```

**Test setup file**:
```typescript
// apps/api/test/setup.ts
import { PrismaClient } from '@signalcraft/database';

// Mock Prisma globally
jest.mock('@signalcraft/database', () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      alertEvent: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      alertGroup: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      // ... mock all models
    })),
  };
});

// Global test utilities
global.createMockUser = () => ({
  id: 'user_123',
  email: 'test@example.com',
  workspaceId: 'workspace_123',
  role: 'ADMIN',
});

global.createMockAlertEvent = () => ({
  id: 'alert_123',
  workspaceId: 'workspace_123',
  source: 'SENTRY',
  sourceEventId: 'event_123',
  project: 'api',
  environment: 'production',
  severity: 'HIGH',
  fingerprint: 'error-hash-123',
  title: 'TypeError in handler',
  message: 'Cannot read property "foo" of undefined',
  occurredAt: new Date(),
  receivedAt: new Date(),
  tagsJson: {},
  payloadJson: {},
});
```

### 1.2 Critical Unit Tests

**Alert Deduplication Logic**:
```typescript
// apps/api/src/alerts/deduplication.service.spec.ts
import { Test } from '@nestjs/testing';
import { DeduplicationService } from './deduplication.service';
import { PrismaService } from '../common/prisma/prisma.service';

describe('DeduplicationService', () => {
  let service: DeduplicationService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DeduplicationService,
        {
          provide: PrismaService,
          useValue: {
            alertGroup: {
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get(DeduplicationService);
    prisma = module.get(PrismaService);
  });

  describe('generateGroupKey', () => {
    it('should generate consistent hash for same inputs', () => {
      const alert1 = {
        source: 'SENTRY',
        project: 'api',
        environment: 'production',
        fingerprint: 'error-123',
      };

      const alert2 = { ...alert1 };

      const key1 = service.generateGroupKey(alert1);
      const key2 = service.generateGroupKey(alert2);

      expect(key1).toBe(key2);
    });

    it('should generate different hashes for different environments', () => {
      const prodAlert = {
        source: 'SENTRY',
        project: 'api',
        environment: 'production',
        fingerprint: 'error-123',
      };

      const stagingAlert = {
        ...prodAlert,
        environment: 'staging',
      };

      const prodKey = service.generateGroupKey(prodAlert);
      const stagingKey = service.generateGroupKey(stagingAlert);

      expect(prodKey).not.toBe(stagingKey);
    });
  });

  describe('findOrCreateGroup', () => {
    it('should create new group if none exists', async () => {
      const alertEvent = createMockAlertEvent();
      
      (prisma.alertGroup.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.alertGroup.create as jest.Mock).mockResolvedValue({
        id: 'group_123',
        groupKey: 'key_123',
        count: 1,
      });

      const result = await service.findOrCreateGroup(alertEvent);

      expect(result.count).toBe(1);
      expect(prisma.alertGroup.create).toHaveBeenCalled();
    });

    it('should update existing group if found within time window', async () => {
      const alertEvent = createMockAlertEvent();
      const existingGroup = {
        id: 'group_123',
        groupKey: 'key_123',
        count: 5,
        lastSeenAt: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
      };

      (prisma.alertGroup.findFirst as jest.Mock).mockResolvedValue(existingGroup);
      (prisma.alertGroup.update as jest.Mock).mockResolvedValue({
        ...existingGroup,
        count: 6,
        lastSeenAt: new Date(),
      });

      const result = await service.findOrCreateGroup(alertEvent);

      expect(result.count).toBe(6);
      expect(prisma.alertGroup.update).toHaveBeenCalledWith({
        where: { id: 'group_123' },
        data: expect.objectContaining({
          count: 6,
          lastSeenAt: expect.any(Date),
        }),
      });
    });

    it('should create new group if existing is outside time window', async () => {
      const alertEvent = createMockAlertEvent();
      const oldGroup = {
        id: 'group_old',
        groupKey: 'key_123',
        count: 10,
        lastSeenAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      };

      (prisma.alertGroup.findFirst as jest.Mock).mockResolvedValue(oldGroup);
      (prisma.alertGroup.create as jest.Mock).mockResolvedValue({
        id: 'group_new',
        groupKey: 'key_123',
        count: 1,
      });

      const result = await service.findOrCreateGroup(alertEvent);

      expect(result.id).toBe('group_new');
      expect(result.count).toBe(1);
      expect(prisma.alertGroup.create).toHaveBeenCalled();
    });
  });
});
```

**Routing Rules Engine**:
```typescript
// apps/api/src/routing/rules-engine.service.spec.ts
describe('RulesEngineService', () => {
  describe('evaluateConditions', () => {
    it('should match environment condition', () => {
      const rule = {
        conditions: {
          all: [
            { field: 'environment', operator: 'equals', value: 'production' }
          ]
        }
      };

      const alert = createMockAlertEvent({ environment: 'production' });
      
      expect(service.evaluateRule(rule, alert)).toBe(true);
    });

    it('should match severity IN condition', () => {
      const rule = {
        conditions: {
          all: [
            { field: 'severity', operator: 'in', value: ['HIGH', 'CRITICAL'] }
          ]
        }
      };

      const alert = createMockAlertEvent({ severity: 'HIGH' });
      
      expect(service.evaluateRule(rule, alert)).toBe(true);
    });

    it('should handle AND logic correctly', () => {
      const rule = {
        conditions: {
          all: [
            { field: 'environment', operator: 'equals', value: 'production' },
            { field: 'severity', operator: 'in', value: ['HIGH', 'CRITICAL'] }
          ]
        }
      };

      const matchingAlert = createMockAlertEvent({ 
        environment: 'production', 
        severity: 'HIGH' 
      });
      
      const nonMatchingAlert = createMockAlertEvent({ 
        environment: 'staging', 
        severity: 'HIGH' 
      });
      
      expect(service.evaluateRule(rule, matchingAlert)).toBe(true);
      expect(service.evaluateRule(rule, nonMatchingAlert)).toBe(false);
    });

    it('should handle OR logic correctly', () => {
      const rule = {
        conditions: {
          any: [
            { field: 'environment', operator: 'equals', value: 'production' },
            { field: 'severity', operator: 'equals', value: 'CRITICAL' }
          ]
        }
      };

      const prodAlert = createMockAlertEvent({ 
        environment: 'production', 
        severity: 'LOW' 
      });
      
      const criticalAlert = createMockAlertEvent({ 
        environment: 'staging', 
        severity: 'CRITICAL' 
      });
      
      expect(service.evaluateRule(rule, prodAlert)).toBe(true);
      expect(service.evaluateRule(rule, criticalAlert)).toBe(true);
    });
  });
});
```

---

## 2. Integration Tests

### 2.1 Alert Ingestion Pipeline

```typescript
// apps/api/test/integration/alert-ingestion.integration.spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';

describe('Alert Ingestion Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await prisma.alertEvent.deleteMany();
    await prisma.alertGroup.deleteMany();
  });

  describe('POST /webhooks/sentry', () => {
    it('should ingest Sentry webhook and create alert', async () => {
      const sentryPayload = {
        id: 'sentry_event_123',
        project: 'my-app',
        event: {
          id: 'event_123',
          title: 'TypeError: Cannot read property',
          message: 'Error in API handler',
          level: 'error',
          environment: 'production',
          fingerprint: ['{{ default }}', 'TypeError'],
          tags: {
            server_name: 'web-1',
            release: 'v1.2.3',
          },
          timestamp: new Date().toISOString(),
        },
      };

      const response = await request(app.getHttpServer())
        .post('/webhooks/sentry')
        .send(sentryPayload)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        alertEventId: expect.any(String),
        alertGroupId: expect.any(String),
      });

      // Verify database state
      const alertEvent = await prisma.alertEvent.findFirst({
        where: { sourceEventId: 'event_123' },
      });

      expect(alertEvent).toBeTruthy();
      expect(alertEvent?.severity).toBe('HIGH');
      expect(alertEvent?.environment).toBe('production');
    });

    it('should deduplicate similar alerts', async () => {
      const basePayload = {
        /* ... same payload structure ... */
      };

      // Send first alert
      await request(app.getHttpServer())
        .post('/webhooks/sentry')
        .send(basePayload)
        .expect(201);

      // Send duplicate alert
      await request(app.getHttpServer())
        .post('/webhooks/sentry')
        .send(basePayload)
        .expect(201);

      // Should only create 1 group
      const groups = await prisma.alertGroup.findMany();
      expect(groups).toHaveLength(1);
      expect(groups[0].count).toBe(2);

      // Should create 2 events
      const events = await prisma.alertEvent.findMany();
      expect(events).toHaveLength(2);
    });

    it('should trigger routing rules', async () => {
      // Create routing rule first
      await prisma.routingRule.create({
        data: {
          workspaceId: 'workspace_123',
          name: 'Production Critical Alerts',
          enabled: true,
          priority: 1,
          conditionsJson: {
            all: [
              { field: 'environment', operator: 'equals', value: 'production' },
              { field: 'severity', operator: 'in', value: ['HIGH', 'CRITICAL'] },
            ],
          },
          actionsJson: {
            slack: {
              channelId: 'C123456',
              mention: '@here',
            },
          },
        },
      });

      // Mock Slack API
      nock('https://slack.com')
        .post('/api/chat.postMessage')
        .reply(200, { ok: true, ts: '1234567890.123456' });

      const payload = {
        /* ... production + high severity payload ... */
      };

      await request(app.getHttpServer())
        .post('/webhooks/sentry')
        .send(payload)
        .expect(201);

      // Verify notification was logged
      const notification = await prisma.notificationLog.findFirst({
        where: { target: 'SLACK' },
      });

      expect(notification).toBeTruthy();
      expect(notification?.status).toBe('SENT');
    });
  });
});
```

### 2.2 Webhook Integration Tests

```typescript
// apps/api/test/integration/webhooks.integration.spec.ts
describe('Webhook Integrations', () => {
  describe('Datadog Webhook', () => {
    it('should normalize Datadog payload correctly', async () => {
      const datadogPayload = {
        /* Datadog-specific format */
      };

      const response = await request(app.getHttpServer())
        .post('/webhooks/datadog')
        .send(datadogPayload)
        .expect(201);

      const alertEvent = await prisma.alertEvent.findFirst({
        where: { source: 'DATADOG' },
      });

      expect(alertEvent).toBeTruthy();
      // Verify normalization
    });
  });

  describe('PagerDuty Webhook', () => {
    it('should handle PagerDuty incident triggers', async () => {
      // Similar test for PagerDuty
    });
  });
});
```

---

## 3. End-to-End Tests

### 3.1 Setup Playwright

```bash
npm install --workspace @signalcraft/web --save-dev \
  @playwright/test \
  playwright
```

```typescript
// apps/web/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### 3.2 Critical User Journeys

**Alert Inbox Flow**:
```typescript
// apps/web/e2e/alert-inbox.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Alert Inbox', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should display alerts in inbox', async ({ page }) => {
    await page.goto('/dashboard/alerts');
    
    // Wait for alerts to load
    await page.waitForSelector('[data-testid="alert-row"]');
    
    const alertCount = await page.locator('[data-testid="alert-row"]').count();
    expect(alertCount).toBeGreaterThan(0);
  });

  test('should filter alerts by environment', async ({ page }) => {
    await page.goto('/dashboard/alerts');
    
    // Open filter dropdown
    await page.click('[data-testid="environment-filter"]');
    await page.click('[data-value="production"]');
    
    // Wait for filtered results
    await page.waitForLoadState('networkidle');
    
    // Verify all visible alerts are production
    const alerts = page.locator('[data-testid="alert-row"]');
    const count = await alerts.count();
    
    for (let i = 0; i < count; i++) {
      const env = await alerts.nth(i).locator('[data-testid="alert-environment"]').textContent();
      expect(env).toBe('production');
    }
  });

  test('should acknowledge alert', async ({ page }) => {
    await page.goto('/dashboard/alerts');
    
    // Click first alert
    await page.click('[data-testid="alert-row"]:first-child');
    
    // Wait for detail panel
    await expect(page.locator('[data-testid="alert-detail"]')).toBeVisible();
    
    // Click acknowledge button
    await page.click('[data-testid="ack-button"]');
    
    // Verify status changed
    await expect(page.locator('[data-testid="alert-status"]')).toHaveText('Acknowledged');
  });

  test('should snooze alert for 1 hour', async ({ page }) => {
    await page.goto('/dashboard/alerts');
    
    await page.click('[data-testid="alert-row"]:first-child');
    await page.click('[data-testid="snooze-button"]');
    await page.click('[data-value="1h"]');
    
    await expect(page.locator('[data-testid="alert-status"]')).toHaveText('Snoozed');
    await expect(page.locator('[data-testid="snooze-until"]')).toContainText('hour');
  });
});
```

**Routing Rules Flow**:
```typescript
// apps/web/e2e/routing-rules.spec.ts
test.describe('Routing Rules', () => {
  test('should create new routing rule', async ({ page }) => {
    await page.goto('/dashboard/rules');
    
    await page.click('[data-testid="create-rule-button"]');
    
    // Fill rule form
    await page.fill('[name="name"]', 'Production High Severity');
    await page.fill('[name="description"]', 'Route critical production alerts');
    
    // Add condition
    await page.click('[data-testid="add-condition"]');
    await page.selectOption('[name="field"]', 'environment');
    await page.selectOption('[name="operator"]', 'equals');
    await page.fill('[name="value"]', 'production');
    
    // Add another condition
    await page.click('[data-testid="add-condition"]');
    await page.selectOption('[name="field"]', 'severity');
    await page.selectOption('[name="operator"]', 'in');
    await page.selectOption('[name="value"]', ['HIGH', 'CRITICAL']);
    
    // Configure action
    await page.selectOption('[name="action"]', 'slack');
    await page.selectOption('[name="slackChannel"]', 'C123456');
    
    await page.click('[data-testid="save-rule"]');
    
    // Verify rule created
    await expect(page.locator('[data-testid="rule-row"]').last()).toContainText('Production High Severity');
  });

  test('should toggle rule enabled/disabled', async ({ page }) => {
    await page.goto('/dashboard/rules');
    
    const toggle = page.locator('[data-testid="rule-toggle"]').first();
    const initialState = await toggle.isChecked();
    
    await toggle.click();
    
    await expect(toggle).toHaveAttribute('aria-checked', String(!initialState));
  });
});
```

---

## 4. Frontend Testing

### 4.1 Setup Vitest + Testing Library

```bash
npm install --workspace @signalcraft/web --save-dev \
  vitest \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jsdom
```

```typescript
// apps/web/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

### 4.2 Component Tests

**Alert Card Component**:
```tsx
// apps/web/components/alerts/alert-card.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertCard } from './alert-card';
import { describe, it, expect, vi } from 'vitest';

describe('AlertCard', () => {
  const mockAlert = {
    id: 'alert_123',
    title: 'TypeError in handler',
    severity: 'HIGH',
    environment: 'production',
    project: 'api',
    count: 5,
    lastSeenAt: new Date('2024-01-20T10:00:00Z'),
    status: 'OPEN',
  };

  it('should render alert information', () => {
    render(<AlertCard alert={mockAlert} />);
    
    expect(screen.getByText('TypeError in handler')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('production')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should call onAcknowledge when ACK button clicked', async () => {
    const onAck = vi.fn();
    render(<AlertCard alert={mockAlert} onAcknowledge={onAck} />);
    
    const ackButton = screen.getByRole('button', { name: /acknowledge/i });
    fireEvent.click(ackButton);
    
    expect(onAck).toHaveBeenCalledWith('alert_123');
  });

  it('should display severity with correct styling', () => {
    render(<AlertCard alert={mockAlert} />);
    
    const severityBadge = screen.getByText('HIGH');
    expect(severityBadge).toHaveClass('bg-red-100', 'text-red-800');
  });
});
```

**Routing Rule Builder**:
```tsx
// apps/web/components/rules/rule-builder.test.tsx
describe('RuleBuilder', () => {
  it('should add condition when button clicked', () => {
    const onChange = vi.fn();
    render(<RuleBuilder value={{ conditions: { all: [] } }} onChange={onChange} />);
    
    fireEvent.click(screen.getByText('Add Condition'));
    
    expect(onChange).toHaveBeenCalledWith({
      conditions: {
        all: [{ field: '', operator: '', value: '' }],
      },
    });
  });

  it('should remove condition', () => {
    const initialRule = {
      conditions: {
        all: [
          { field: 'environment', operator: 'equals', value: 'production' },
          { field: 'severity', operator: 'in', value: ['HIGH'] },
        ],
      },
    };
    
    const onChange = vi.fn();
    render(<RuleBuilder value={initialRule} onChange={onChange} />);
    
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    fireEvent.click(removeButtons[0]);
    
    expect(onChange).toHaveBeenCalledWith({
      conditions: {
        all: [{ field: 'severity', operator: 'in', value: ['HIGH'] }],
      },
    });
  });
});
```

---

## 5. API Documentation with Swagger

### 5.1 Enable Swagger in NestJS

```typescript
// apps/api/src/main.ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('SignalCraft API')
    .setDescription('Alert management and observability platform API')
    .setVersion('1.0')
    .addTag('alerts', 'Alert management endpoints')
    .addTag('routing', 'Routing rules configuration')
    .addTag('integrations', 'External service integrations')
    .addTag('webhooks', 'Webhook ingestion endpoints')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'Authorization',
      description: 'Enter Clerk JWT token',
      in: 'header',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(4000);
}
```

### 5.2 Annotate Controllers

```typescript
// apps/api/src/alerts/alerts.controller.ts
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('alerts')
@ApiBearerAuth()
@Controller('alerts')
export class AlertsController {
  @Get()
  @ApiOperation({ 
    summary: 'List alerts',
    description: 'Retrieve paginated list of alerts with optional filters'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'List of alerts retrieved successfully',
    type: [AlertEventDto]
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async listAlerts(
    @Query() filters: AlertFiltersDto
  ): Promise<PaginatedResponse<AlertEventDto>> {
    // ...
  }

  @Post(':id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge alert group' })
  @ApiResponse({ status: 200, description: 'Alert acknowledged' })
  async acknowledgeAlert(@Param('id') id: string) {
    // ...
  }
}
```

### 5.3 Document DTOs

```typescript
// apps/api/src/alerts/dto/alert-event.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class AlertEventDto {
  @ApiProperty({ example: 'alert_123' })
  id: string;

  @ApiProperty({ example: 'SENTRY' })
  source: string;

  @ApiProperty({ example: 'production' })
  environment: string;

  @ApiProperty({ 
    enum: ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    example: 'HIGH'
  })
  severity: string;

  @ApiProperty({ example: 'TypeError in API handler' })
  title: string;

  @ApiProperty()
  occurredAt: Date;
}
```

---

## 6. Comprehensive Documentation

### 6.1 Architecture Documentation

Create `Docs/architecture/` directory with:

**System Architecture**:
```markdown
# System Architecture

## Overview
SignalCraft is built on a modern, scalable architecture...

[Mermaid diagram of components]

## Data Flow
1. Webhook ingestion
2. Normalization
3. Deduplication
4. Routing evaluation
5. Notification dispatch

## Technology Decisions
- **Why NestJS?** Enterprise-grade Node.js framework with TypeScript
- **Why Prisma?** Type-safe ORM with excellent DX
- **Why BullMQ?** Reliable job queue with Redis
```

**Database Schema Documentation**:
```markdown
# Database Schema

## Entity Relationship Diagram
[Mermaid ERD]

## Core Entities

### AlertEvent
Represents individual alert occurrences...

### AlertGroup
Deduplicated group of similar alerts...
```

### 6.2 Integration Guides

Create `Docs/integrations/` with guides for each:
- Sentry Integration
- Datadog Integration
- Slack Setup
- PagerDuty Connection

### 6.3 Runbooks

Create `Docs/runbooks/` for:
- Production deployment
- Database migrations
- Incident response
- Backup and restore

---

## 7. CI/CD Pipelines

### 7.1 GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test

on:
  pull_request:
  push:
    branches: [main, develop]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:6
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run migrations
        run: npm run db:migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/signalcraft_test
      
      - name: Run tests
        run: npm run test --workspace @signalcraft/api
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/signalcraft_test
          REDIS_URL: redis://localhost:6379
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test --workspace @signalcraft/web
      
      - name: Type check
        run: npm run typecheck

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e --workspace @signalcraft/web
      
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: apps/web/playwright-report/
```

---

## 📊 Success Metrics

- [ ] 80%+ code coverage achieved
- [ ] All critical paths have integration tests
- [ ] E2E tests cover top 3 user journeys
- [ ] Swagger docs accessible at `/api/docs`
- [ ] CI/CD pipeline runs on every PR
- [ ] Documentation review completed
- [ ] 0 failing tests in CI

---

## 📝 Deliverables

1. **Test Suites**:
   - [ ] 50+ unit tests
   - [ ] 20+ integration tests
   - [ ] 10+ E2E tests

2. **Documentation**:
   - [ ] API documentation (Swagger)
   - [ ] Architecture guide
   - [ ] Integration guides
   - [ ] Runbooks
   - [ ] Contributing guide

3. **Infrastructure**:
   - [ ] CI/CD pipelines
   - [ ] Code coverage reports
   - [ ] Test database seeding

---

## ⏱️ Timeline

**Week 1**: Backend unit + integration tests
**Week 2**: Frontend component tests
**Week 3**: E2E tests + Swagger documentation
**Week 4**: Architecture docs + runbooks + CI/CD

---

## ✅ Definition of Done

- All tests passing in CI
- Coverage reports generated
- Documentation published and accessible
- Team trained on testing practices
- CI/CD pipeline automated
