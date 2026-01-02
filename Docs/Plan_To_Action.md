# SignalCraft Production-Ready Implementation Plan

## Overview

This plan transforms SignalCraft from concept to production-ready application, organized into 6 sequential phases. Each phase builds upon the previous, ensuring a solid foundation before adding complexity.

## Architecture Overview

```javascript
┌─────────────┐
│   Next.js   │  Frontend (Dashboard, Alert Inbox, Rules Management)
│   Frontend  │
└──────┬──────┘
       │
       │ REST API
       │
┌──────▼──────┐
│   NestJS    │  Backend API (Webhooks, Rules Engine, Notifications)
│   Backend   │
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
┌──▼──┐ ┌──▼──┐
│Postgres│ │Redis │  Data & Queue (BullMQ for jobs)
└───────┘ └──────┘
       │
   ┌───┴───┐
   │       │
┌──▼──┐ ┌──▼──┐
│Sentry│ │Slack│  External Integrations
└──────┘ └─────┘
```

## Phase 1: Foundation & Infrastructure (Week 1-2)

### 1.1 Monorepo Setup

- **Location**: Root directory structure

- **Structure**:

  ```javascript
    SignalCraft/
    ├── apps/
    │   ├── web/          # Next.js frontend
    │   └── api/           # NestJS backend
    ├── packages/
    │   ├── shared/        # Shared types, utils
    │   ├── database/      # Prisma/Drizzle schema
    │   └── config/        # Shared configs
    ├── .github/workflows/ # CI/CD
    └── docker/            # Docker configs
  ```

- **Tools**: Turborepo or Nx for monorepo management
- **Config**: TypeScript path aliases, shared tsconfig

### 1.2 Database & ORM Setup

- **File**: `packages/database/schema.prisma` or Drizzle schema

- **Database**: PostgreSQL with connection pooling

- **Schema**: Implement all entities from [Software_Doc.md](Software_Doc.md):

- Workspace, User, Integration, AlertEvent, AlertGroup, RoutingRule, NotificationLog

- **Migrations**: Version-controlled migrations

- **Seeding**: Development seed data

### 1.3 Authentication & Authorization

- **File**: `apps/api/src/auth/` module

- **Provider**: Clerk or Auth.js (NextAuth)
- **Features**:

- Email/password + OAuth (Google/GitHub)
- Workspace-based multi-tenancy
- RBAC: owner/admin/member roles

- Session management

- **Middleware**: Workspace context injection, role-based guards

### 1.4 Backend API Foundation

- **File**: `apps/api/src/main.ts`

- **Framework**: NestJS with TypeScript
- **Structure**:

- Module-based architecture
- Global exception filters

- Request validation (class-validator)

- API documentation (Swagger/OpenAPI)

- **Environment**: Config module for env vars

### 1.5 Frontend Foundation

- **File**: `apps/web/` (Next.js 14+ with App Router)
- **Features**:
- Authentication pages (login/signup)

- Protected route middleware

- Workspace context provider

- UI component library (shadcn/ui or similar)

- State management (Zustand or React Query)

### 1.6 Queue System Setup

- **File**: `apps/api/src/queue/` module

- **Tool**: BullMQ with Redis
- **Queues**:

- `notifications` - Slack message sending

- `escalations` - Delayed escalation jobs

- `alert-processing` - Alert normalization and grouping

### 1.7 CI/CD Pipeline

- **File**: `.github/workflows/ci.yml`
- **Stages**:
- Lint (ESLint)

- Type check (TypeScript)
- Unit tests
- Build verification

- Integration tests (optional in CI)

- **Triggers**: PR and main branch

### 1.8 Docker & Local Development

- **Files**: `docker-compose.yml`, `Dockerfile` (api, web)

- **Services**: PostgreSQL, Redis, API, Web

- **Scripts**: `package.json` scripts for dev/test/build

## Phase 2: Core Alert Processing (Week 3-4)

### 2.1 Webhook Ingestion

- **File**: `apps/api/src/webhooks/sentry.controller.ts`
- **Endpoint**: `POST /webhooks/sentry`

- **Features**:

- Signature verification (if available)

- Idempotency (duplicate `source_event_id` handling)

- Rate limiting (per workspace)

- Request logging

- **Validation**: Validate Sentry payload structure

### 2.2 Alert Normalization

- **File**: `apps/api/src/alerts/normalization.service.ts`

- **Purpose**: Convert Sentry payload → `NormalizedAlert` schema
- **Mapping**:

- Extract: source, project, environment, severity, fingerprint

- Map Sentry severity levels to internal levels

- Extract tags and metadata

- Generate deep link back to Sentry

### 2.3 Alert Deduplication Engine

- **File**: `apps/api/src/alerts/grouping.service.ts`

- **Logic**:

- Generate `group_key = hash(source + project + env + fingerprint)`
- Check for existing `AlertGroup` within dedup window (30-60 min)

- Create new group or update existing (increment count, update timestamps)

- **Database**: Upsert logic with transaction safety

### 2.4 Alert Storage

- **File**: `apps/api/src/alerts/alerts.service.ts`

- **Operations**:

- Save `AlertEvent` (raw payload + normalized data)
- Create/update `AlertGroup`
- Link events to groups

- **Database**: Optimized queries with indexes on `group_key`, `workspace_id`, `status`

### 2.5 Alert Processing Pipeline

- **File**: `apps/api/src/alerts/alert-processor.service.ts`

- **Flow**:

1. Receive webhook → normalize
2. Check idempotency
3. Deduplicate/group

4. Trigger routing rules evaluation

5. Queue notifications if matched

## Phase 3: Integrations & Notifications (Week 5-6)

### 3.1 Slack OAuth Integration

- **File**: `apps/api/src/integrations/slack/slack-oauth.service.ts`
- **Endpoints**:

- `GET /api/integrations/slack/connect` - Initiate OAuth

- `GET /api/integrations/slack/callback` - Handle callback
- **Scopes**: `chat:write`, `channels:read`, `groups:read`

- **Storage**: Encrypted bot tokens in `Integration` table

- **UI**: Integration management page in frontend

### 3.2 Slack Notification Service

- **File**: `apps/api/src/integrations/slack/slack-notification.service.ts`
- **Features**:

- Format alert messages with severity badges

- Include environment, project, count
- Add interactive buttons (Ack, Snooze, Resolve)

- Handle channel mentions (@here for critical)

- **Queue**: Use BullMQ for async sending
- **Retry**: Exponential backoff on failures

### 3.3 Slack Interactive Actions

- **File**: `apps/api/src/webhooks/slack-actions.controller.ts`

- **Endpoint**: `POST /webhooks/slack/actions`

- **Actions**:

- Acknowledge → update `AlertGroup.status = 'ack'`

- Snooze → set snooze until timestamp

- Resolve → update `AlertGroup.status = 'resolved'`

- **Response**: Update Slack message to reflect new status

### 3.4 Notification Logging

- **File**: `apps/api/src/notifications/notification-log.service.ts`

- **Purpose**: Track all notification attempts

- **Log**: `NotificationLog` entries for each send attempt

- **Fields**: status (sent/failed), error_message, sent_at, target

## Phase 4: Routing Rules & Alert Hygiene (Week 7-8)

### 4.1 Routing Rules Engine

- **File**: `apps/api/src/routing/rules-engine.service.ts`

- **Evaluation**:

- Match alert against rule conditions (env, severity, project, tags)

- Execute actions (Slack channel, escalation settings)

- Support multiple rules per alert (ordered priority)

- **Conditions**: JSON-based flexible matching

### 4.2 Routing Rules API

- **File**: `apps/api/src/routing/routing-rules.controller.ts`

- **Endpoints**:

- `GET /api/routing-rules` - List rules
- `POST /api/routing-rules` - Create rule

- `PUT /api/routing-rules/:id` - Update rule

- `DELETE /api/routing-rules/:id` - Delete rule

- **Validation**: Validate condition JSON structure

### 4.3 Routing Rules UI

- **File**: `apps/web/app/routing-rules/` pages
- **Features**:

- Visual rule builder (condition + action)

- Test rule against sample alerts

- Enable/disable rules

- Rule priority ordering

### 4.4 Escalation System

- **File**: `apps/api/src/escalations/escalation.service.ts`

- **Logic**:

- Schedule delayed job when alert group created

- Check if acknowledged after N minutes

- If not ACKed: re-notify + mention owner/oncall

- Cancel job if alert is ACKed/resolved

- **Queue**: BullMQ delayed jobs

### 4.5 Alert Hygiene Features

- **Files**: `apps/api/src/alerts/hygiene.service.ts`

- **Features**:

- Snooze: Suppress notifications for X hours

- Auto-close: Resolve groups after inactivity period

- Manual resolve: Update status via API/UI

- **UI**: Action buttons in alert detail page

## Phase 5: Frontend Dashboard & UI (Week 9-10)

### 5.1 Overview Dashboard

- **File**: `apps/web/app/dashboard/page.tsx`

- **Metrics**:
- Alerts last 24h (count, trend)

- Deduplication ratio (% grouped)

- Acknowledgment rate
- Top noisy sources

- Integration health status

- **Charts**: Use recharts or similar for visualizations

### 5.2 Alert Inbox

- **File**: `apps/web/app/alerts/page.tsx`

- **Features**:

- Table view with sorting

- Filters: env, project, severity, status, date range
- Pagination

- Real-time updates (polling or WebSocket)

- Status badges, severity indicators

- **Columns**: Time, Source, Project, Env, Severity, Status, Count, Assignee

### 5.3 Alert Group Detail Page

- **File**: `apps/web/app/alerts/[id]/page.tsx`
- **Features**:

- Timeline of related events

- Group metadata (first seen, last seen, count)
- Assignee management

- Runbook URL field

- Notes/comments

- Action buttons (Ack, Snooze, Resolve)

- Related alerts list (collapsed/expandable)

### 5.4 Integration Management UI

- **File**: `apps/web/app/integrations/page.tsx`

- **Features**:

- List connected integrations
- Connect/disconnect buttons

- Health status indicators
- Last webhook received timestamp
- Test webhook button

- Configuration display (masked secrets)

### 5.5 Settings & Workspace Management

- **File**: `apps/web/app/settings/` pages

- **Features**:

- Workspace settings

- User management (invite, roles)

- API keys (if needed)

- Notification preferences

## Phase 6: Production Hardening (Week 11-12)

### 6.1 Security Enhancements

- **Files**: Multiple security modules

- **Features**:

- Token encryption at rest (libsodium or AWS KMS)

- API rate limiting (per workspace, per endpoint)

- CORS configuration

- Input sanitization

- SQL injection prevention (ORM usage)

- XSS protection

- CSRF tokens for state-changing operations

### 6.2 Error Handling & Logging

- **File**: `apps/api/src/common/filters/` exception filters

- **Tools**: Winston or Pino for structured logging

- **Features**:

- Centralized error handling

- Error tracking (Sentry integration for app itself)

- Request/response logging (sanitized)

- Log levels (dev vs prod)

### 6.3 Performance Optimization

- **Database**:

- Indexes on frequently queried fields

- Query optimization
- Connection pooling

- Read replicas (if needed)
- **API**:

- Response caching (Redis) for dashboard metrics

- Pagination for large datasets

- Lazy loading where appropriate
- **Frontend**:

- Code splitting

- Image optimization

- API response caching

### 6.4 Monitoring & Observability

- **File**: `apps/api/src/monitoring/` module

- **Tools**:

- Health check endpoints (`/health`, `/ready`)

- Metrics collection (Prometheus format)

- Application performance monitoring
- **Metrics**:

- Webhook ingestion rate

- Notification success/failure rate

- Alert processing latency
- Queue depth

### 6.5 Data Retention & Cleanup

- **File**: `apps/api/src/jobs/cleanup.service.ts`

- **Jobs**:

- Archive old resolved alerts (after X days)

- Clean up old notification logs

- Purge expired escalation jobs

- **Schedule**: Daily cron job

### 6.6 Documentation

- **Files**: `README.md`, `docs/` directory

- **Content**:
- Setup instructions

- API documentation (OpenAPI/Swagger)
- Architecture diagrams
- Deployment guide

- Troubleshooting guide

## Phase 7: Testing & Validation (Week 13)

### 7.1 Unit Tests

- **Coverage**: Target 70%+ for business logic

- **Focus Areas**:

- Alert normalization logic

- Deduplication algorithm

- Rule evaluation engine

- Severity mapping

- **Tools**: Jest or Vitest

### 7.2 Integration Tests

- **Scenarios**:

- Sentry webhook → AlertGroup creation

- Routing rule → Slack notification

- Interactive button → Status update

- Escalation job execution

- **Tools**: Supertest for API, mock Slack API

### 7.3 End-to-End Tests

- **File**: `e2e/` directory

- **Scenarios**:

- Complete flow: Sentry error → Group → Slack → ACK

- Rule creation and matching

- Integration connection flow

- **Tools**: Playwright or Cypress

### 7.4 Load Testing

- **Tools**: k6 or Artillery

- **Scenarios**:

- High webhook volume
- Concurrent rule evaluations

- Notification queue processing

- **Goals**: Define performance benchmarks

### 7.5 Demo Environment Setup

- **Requirements**:

- Demo Sentry project with sample errors

- Demo Slack workspace

- Pre-configured routing rules

- Sample data for dashboard

## Phase 8: Deployment & Production Setup (Week 14)

### 8.1 Infrastructure as Code

- **Files**: Terraform or similar

- **Resources**:

- PostgreSQL database (managed service)

- Redis cluster

- Application servers (containers)

- Load balancer
- SSL certificates

### 8.2 Deployment Pipeline

- **File**: `.github/workflows/deploy.yml`
- **Stages**:

- Build Docker images

- Run tests

- Push to container registry

- Deploy to staging
- Run smoke tests

- Deploy to production (manual approval)

- **Environments**: Dev, Staging, Production

### 8.3 Environment Configuration

- **Secrets Management**: Use provider's secret manager (AWS Secrets Manager, etc.)

- **Environment Variables**: Documented and version-controlled (values excluded)

- **Config Validation**: Fail fast on missing required vars

### 8.4 Database Migrations in Production

- **Strategy**: Automated migration on deployment

- **Safety**: Backup before migrations

- **Rollback**: Plan for migration rollback

### 8.5 Backup & Disaster Recovery

- **Database**: Automated daily backups, point-in-time recovery

- **Secrets**: Backup encrypted tokens (encrypted backups)

- **Recovery Plan**: Documented procedures

### 8.6 Production Monitoring

- **Tools**:

- Uptime monitoring (Pingdom, UptimeRobot)

- Error tracking (Sentry for the app itself)

- Log aggregation (Datadog, Logtail, or similar)

- **Alerts**: Set up alerts for critical failures

## Success Criteria

### MVP Completion

- [ ] Sentry alerts ingested and grouped correctly

- [ ] Alerts routed to Slack based on rules

- [ ] Interactive buttons (ACK/Snooze/Resolve) work

- [ ] Dashboard shows key metrics

- [ ] Integration health visible

- [ ] End-to-end demo works in <5 minutes

### Production Readiness

- [ ] All tests passing (unit, integration, E2E)

- [ ] Security audit completed
- [ ] Performance benchmarks met

- [ ] Monitoring and alerting configured

- [ ] Documentation complete

- [ ] Disaster recovery plan documented

- [ ] Load testing passed

## Risk Mitigation

1. **Integration Failures**: Implement retry logic, circuit breakers, fallback notifications

2. **High Alert Volume**: Queue-based processing, rate limiting, horizontal scaling

3. **Data Loss**: Regular backups, transaction safety, idempotency

4. **Security Breaches**: Encryption, regular security audits, least privilege access

## Post-MVP Enhancements (Future Phases)

- Additional integrations (Datadog, Grafana, PagerDuty)

- On-call schedule management

- Incident postmortem tracking
