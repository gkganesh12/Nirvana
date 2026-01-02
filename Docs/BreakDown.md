# SignalCraft — Jira-Style Task Breakdown

> Scope: MVP for **Monitoring + Alerting wedge** (Sentry + Slack + Web App)
> Goal: Ship a working, testable product that proves alert-noise reduction and faster response.

---

## EPIC 0: Project Setup & Foundations

### AHH-1: Create mono-repo structure

**Type:** Task
**Priority:** High
**Description:**

- Setup mono-repo with `apps/web`, `apps/api`, `packages/shared`
- Configure TypeScript paths

**Acceptance Criteria:**

- Repo builds locally
- Shared package usable in both web + api

---

### AHH-2: Environment configuration

**Type:** Task
**Priority:** High
**Description:**

- Setup env handling for local/dev/prod
- `.env.example` with required keys

**Acceptance Criteria:**

- App boots with only env variables
- Missing env throws clear error

---

### AHH-3: CI baseline

**Type:** Task
**Priority:** Medium
**Description:**

- GitHub Actions pipeline
- Lint + typecheck + test on PR

**Acceptance Criteria:**

- CI runs on every PR
- Fails on type or lint error

---

## EPIC 1: Auth, Workspace & Users

### AHH-10: Authentication setup

**Type:** Story
**Priority:** High
**Description:**

- Integrate Auth (Clerk/Auth.js)
- Email login

**Acceptance Criteria:**

- User can sign up and sign in
- Session persists

---

### AHH-11: Workspace creation

**Type:** Story
**Priority:** High
**Description:**

- Auto-create workspace on first signup
- User becomes workspace owner

**Acceptance Criteria:**

- Workspace record created
- User linked to workspace

---

### AHH-12: Basic RBAC

**Type:** Task
**Priority:** Medium
**Description:**

- Roles: owner, admin, member
- Enforce permissions in API

**Acceptance Criteria:**

- Member cannot access admin routes

---

## EPIC 2: Database & Core Models

### AHH-20: Database setup

**Type:** Task
**Priority:** High
**Description:**

- Postgres setup
- Prisma/Drizzle ORM

**Acceptance Criteria:**

- DB connects locally
- Migration runs

---

### AHH-21: Core schema migrations

**Type:** Story
**Priority:** High
**Tables:**

- Workspace
- User
- Integration
- AlertEvent
- AlertGroup
- RoutingRule
- NotificationLog

**Acceptance Criteria:**

- Tables created
- Foreign keys enforced

---

## EPIC 3: Sentry Integration (Alert Ingestion)

### AHH-30: Sentry webhook endpoint

**Type:** Story
**Priority:** High
**Description:**

- Create `POST /webhooks/sentry`
- Accept and log payload

**Acceptance Criteria:**

- Webhook responds 200
- Payload stored

---

### AHH-31: Alert normalization

**Type:** Story
**Priority:** High
**Description:**

- Convert Sentry payload → NormalizedAlert
- Map severity, env, fingerprint

**Acceptance Criteria:**

- Normalized object saved
- Required fields present

---

### AHH-32: Alert deduplication & grouping

**Type:** Story
**Priority:** High
**Description:**

- Generate `group_key`
- Create/update AlertGroup
- Increment count + timestamps

**Acceptance Criteria:**

- Repeated alerts update same group
- New group created after window expiry

---

## EPIC 4: Alert Inbox & UI

### AHH-40: Alert inbox API

**Type:** Story
**Priority:** High
**Description:**

- `GET /api/alert-groups`
- Filtering + pagination

**Acceptance Criteria:**

- Filters work
- Only workspace data visible

---

### AHH-41: Alert inbox UI

**Type:** Story
**Priority:** High
**Description:**

- Table view
- Status, severity badges

**Acceptance Criteria:**

- Inbox renders
- Filters usable

---

### AHH-42: Alert group detail page

**Type:** Story
**Priority:** Medium
**Description:**

- Timeline of events
- Group metadata

**Acceptance Criteria:**

- Shows all related events

---

## EPIC 5: Slack Integration & Notifications

### AHH-50: Slack OAuth connection

**Type:** Story
**Priority:** High
**Description:**

- Slack app OAuth
- Store bot token securely

**Acceptance Criteria:**

- Slack workspace connected

---

### AHH-51: Slack notification sender

**Type:** Story
**Priority:** High
**Description:**

- Post alert message to channel
- Include severity + env

**Acceptance Criteria:**

- Message appears in Slack

---

### AHH-52: Interactive buttons (ACK/Snooze/Resolve)

**Type:** Story
**Priority:** High
**Description:**

- Slack actions endpoint
- Update AlertGroup status

**Acceptance Criteria:**

- Button click updates status
- UI reflects change

---

## EPIC 6: Routing Rules Engine

### AHH-60: Routing rule schema

**Type:** Task
**Priority:** High
**Description:**

- Conditions + actions JSON

**Acceptance Criteria:**

- Rules saved + retrievable

---

### AHH-61: Rule evaluation engine

**Type:** Story
**Priority:** High
**Description:**

- Match alert → routing rule
- Execute Slack action

**Acceptance Criteria:**

- Correct channel selected

---

### AHH-62: Escalation scheduler

**Type:** Story
**Priority:** Medium
**Description:**

- If not ACKed in N minutes → re-notify

**Acceptance Criteria:**

- Escalation fires on time

---

## EPIC 7: Alert Hygiene Controls

### AHH-70: Snooze functionality

**Type:** Story
**Priority:** Medium
**Description:**

- Snooze group for X time

**Acceptance Criteria:**

- Alerts suppressed during snooze

---

### AHH-71: Auto-close logic

**Type:** Task
**Priority:** Low
**Description:**

- Close group after inactivity

**Acceptance Criteria:**

- Group resolves automatically

---

## EPIC 8: Delivery Health & Reliability

### AHH-80: Notification logs

**Type:** Story
**Priority:** High
**Description:**

- Log Slack send attempts
- Capture failures

**Acceptance Criteria:**

- Failures visible in UI

---

### AHH-81: Integration health dashboard

**Type:** Story
**Priority:** Medium
**Description:**

- Last webhook received
- Last Slack success

**Acceptance Criteria:**

- Health visible per integration

---

## EPIC 9: Security & Hardening

### AHH-90: Token encryption

**Type:** Task
**Priority:** High
**Description:**

- Encrypt Slack tokens
- Secure secrets

**Acceptance Criteria:**

- Tokens unreadable in DB

---

### AHH-91: Webhook protection

**Type:** Task
**Priority:** Medium
**Description:**

- Rate limiting
- Idempotency

**Acceptance Criteria:**

- Duplicate events ignored

---

## EPIC 10: Testing & Validation

### AHH-100: Unit tests

**Type:** Task
**Priority:** Medium
**Description:**

- Dedup logic
- Rule evaluation

**Acceptance Criteria:**

- Tests pass

---

### AHH-101: Integration tests

**Type:** Story
**Priority:** Medium
**Description:**

- Sentry payload → Slack message

**Acceptance Criteria:**

- End-to-end flow works

---

## EPIC 11: Demo & Readiness

### AHH-110: Demo project setup

**Type:** Task
**Priority:** Medium
**Description:**

- Demo Sentry project
- Demo Slack workspace

---

### AHH-111: Demo script

**Type:** Task
**Priority:** Medium
**Description:**

- 5-min walkthrough steps

---

## MVP EXIT CRITERIA

- Sentry alerts ingested & grouped
- Routed to Slack with ACK/Snooze
- Noise reduced via grouping
- Delivery health visible
- Can demo end-to-end in <5 minutes

---
