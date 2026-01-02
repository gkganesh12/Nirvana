# SignalCraft (Monitoring + Alerting)

## 0) One-line wedge

A lightweight “done-right” layer on top of existing monitoring tools that **reduces alert noise, prevents missed critical alerts, and makes incidents actionable** — without needing a full SRE/DevOps team.

This is NOT “another Datadog/Sentry.”
This is: **better alerting outcomes** (signal, routing, runbooks, accountability) using what teams already have.

---

## 1) Problem statement (what you’re actually fixing)

Small/mid SaaS teams usually have _some_ monitoring (Sentry / CloudWatch / Datadog / Grafana), but:

- Alerts are **too noisy** → team ignores them.
- Some alerts are **missing / misrouted** → they learn only when client complains.
- Alerts don’t tell “what to do next” → triage takes too long.
- Ownership is unclear → “who’s on it?” chaos.

Your product/service wedge: **make alerts boring, actionable, and trustworthy**.

---

## 2) Target users (who will pay)

Primary: Founder/CTO of a client-serving SaaS (10–60 people) with:

- No dedicated SRE team
- Frequent client escalations
- Slack-based ops

Secondary: Engineering Manager / Tech Lead who is on-call by default.

---

## 3) Outcomes (what “success” means)

You need 3 hard outcomes to sell:

1. **Noise down**: 60–90% reduction in “non-actionable” alerts.
2. **MTTA down**: mean-time-to-acknowledge improves (people see + respond faster).
3. **No missed critical**: paging alerts are reliable (delivery checks + redundancy).

You’ll measure this inside the app.

---

## 4) MVP Scope (build this first)

### MVP = Sentry + Slack + Your Web App

Start with Sentry because it’s common and has clear alert payloads.

**Core MVP features:**

1. **Unified Alert Inbox**

   - Ingest alerts via webhooks (Sentry Alert Webhook)
   - Normalize into your own schema
   - Show feed with filters (service, env, severity, status)

2. **Dedup + Grouping**

   - Group repeated alerts into one “Incident Candidate”
   - Basic rules: fingerprint + time-window + environment

3. **Routing Rules → Slack**

   - Route based on environment, project, tags, severity
   - Example: prod + high severity → #oncall
   - staging/low → #dev-alerts

4. **Alert Hygiene Controls**

   - Snooze
   - Auto-close after X if no repeat
   - Escalate if not acknowledged in X minutes

5. **Runbook Links**

   - Every rule/incident can have “Runbook URL”
   - Quick actions: “Restart service”, “Rollback last deploy” (even if it’s just links initially)

6. **Delivery Health**

   - A simple “notification delivery check” dashboard (last delivered to Slack, last webhook received)
   - This is super important because “missing alerts” is real.

### What NOT in MVP (avoid overbuild)

- Full APM
- Log search
- Multi-cloud deep integrations
- ML anomaly detection
- PagerDuty / Opsgenie (add later)

---

## 5) Product concept (screens)

### Screen A: Overview Dashboard

- Alerts last 24h
- % grouped (dedup ratio)
- Ack rate
- Top noisy sources
- “Last webhook received” (per integration)

### Screen B: Alert Inbox

- Table: Time | Source | Project | Env | Severity | Status | Group | Assignee
- Filters: env, project, tag, severity, status

### Screen C: Incident Candidate (group detail)

- Title + timeline
- Related alerts (collapsed)
- Suggested severity
- Assignee + status
- Runbook + notes

### Screen D: Routing Rules

- If (env=prod AND severity>=high AND project in X) → Slack channel Y
- Escalate after N minutes without ACK

### Screen E: Integrations

- Sentry connected
- Slack connected
- Webhook status + test button

---

## 6) Data model (simple, scalable)

### Entities

**Workspace**

- id, name

**User**

- id, workspace_id, email, role (owner/admin/member)

**Integration**

- id, workspace_id, type (SENTRY/SLACK), status, config_json (encrypted)

**AlertEvent** (raw-ish)

- id, workspace_id
- source (SENTRY)
- source_event_id
- project
- environment
- severity (info/low/med/high/critical)
- fingerprint (string)
- tags_json
- title, message
- occurred_at
- received_at
- payload_json

**AlertGroup** (dedup bucket)

- id, workspace_id
- group_key (derived)
- title
- severity
- environment
- status (open/ack/snoozed/resolved)
- assignee_user_id (nullable)
- first_seen_at, last_seen_at
- count
- runbook_url (nullable)

**RoutingRule**

- id, workspace_id
- conditions_json
- actions_json (slack_channel_id, escalate_after_minutes)
- enabled

**NotificationLog**

- id, workspace_id
- target (SLACK)
- target_ref (channel_id)
- alert_group_id
- status (sent/failed)
- error_message
- sent_at

---

## 7) Normalization format (important)

Define one internal schema so you can add Datadog/Grafana later.

**NormalizedAlert**

- source
- source_event_id
- service/project
- env
- severity
- fingerprint
- title
- description
- tags
- occurred_at
- link (deep link back to tool)

This lets you grow without rewrites.

---

## 8) Dedup + severity heuristics (no AI needed)

### Group key

`group_key = hash(source + project + env + fingerprint)`

### Dedup window logic

- If same group_key arrives within last 30–60 minutes → increment count, update last_seen
- Else create new group

### Severity mapping (MVP)

- Map Sentry “error/fatal” → high/critical
- If env=prod and count spikes fast → bump one level

### “Noisy source” scoring

- group_count_last_24h
- unique_groups_last_24h
- ratio = total_events / unique_groups
  High ratio → noisy (repeat spam).

---

## 9) Routing + escalation (MVP rules)

### Conditions

- env in {prod, staging}
- severity >= {med/high}
- project in list
- tag contains key/value

### Actions

- Slack post to channel
- Mention @here only for high/critical
- Escalate: if not ACK in N minutes → post again + mention owner

### ACK mechanism

- Slack interactive message buttons:

  - Ack
  - Snooze 1h
  - Resolve

Your backend receives button callbacks.

---

## 10) Tech stack (pragmatic)

Since you’re already in Node/TS land:

**Backend**: Node.js + TypeScript (NestJS or Express)

- Webhook ingestion endpoints
- Rule engine
- Slack API

**DB**: Postgres

- Works for analytics + relational entities

**Queue**: BullMQ (Redis) or RabbitMQ (BullMQ is enough for MVP)

- Notification sending
- Escalation timers

**Frontend**: Next.js (or React + Vite)

- Auth
- Dashboard

**Auth**: WorkOS / Clerk / Auth.js (choose what’s fastest)

- Workspace + RBAC

**Hosting**:

- Render/Fly.io/Railway for MVP
- Redis add-on

---

## 11) Integrations (step-by-step)

### A) Slack

1. Create Slack app
2. OAuth scopes:

   - chat:write
   - channels:read
   - groups:read (if private channels)
   - commands (optional)
   - interactive messages

3. Store tokens encrypted
4. Implement:

   - Post message
   - Interactive callbacks

### B) Sentry

1. Create “Alert webhook” in Sentry
2. Your endpoint: `POST /webhooks/sentry`
3. Verify signature if available (or shared secret)
4. Parse payload → NormalizedAlert → save AlertEvent → upsert AlertGroup
5. Trigger routing rules

---

## 12) API design (MVP endpoints)

### Ingestion

- `POST /webhooks/sentry`
- `POST /webhooks/slack/actions`

### App

- `GET /api/dashboard/overview`
- `GET /api/alerts` (filters)
- `GET /api/alert-groups/:id`
- `POST /api/alert-groups/:id/ack`
- `POST /api/alert-groups/:id/snooze`
- `POST /api/alert-groups/:id/resolve`

### Rules

- `GET /api/routing-rules`
- `POST /api/routing-rules`
- `PUT /api/routing-rules/:id`
- `DELETE /api/routing-rules/:id`

### Integrations

- `POST /api/integrations/slack/connect` (OAuth start)
- `GET /api/integrations/slack/callback`
- `POST /api/integrations/sentry/test-webhook`

---

## 13) Security + reliability basics

- Encrypt integration tokens at rest (KMS or libsodium + master key)
- Rate-limit webhook endpoints
- Idempotency: ignore duplicate source_event_id
- Keep raw payloads for debugging (but protect access)
- Audit log (later)

---

## 14) Testing plan (so you can actually validate)

### Unit tests

- Dedup key generation
- Rule evaluation
- Severity mapping

### Integration tests

- Sentry webhook sample payloads → should create AlertGroup
- Slack post + action callbacks (mock Slack API)

### E2E test

- Use a demo Sentry project
- Trigger an error
- Validate: webhook received → group created → Slack message posted → Ack updates status

### “Reality test” checklist (what proves it works)

- Can you reduce 100 noisy alerts into 5 grouped incidents?
- Does escalation fire if nobody ACKs?
- Does your delivery health show if Slack token expired / webhook failing?

---

## 15) MVP build plan (7-day sprint style)

### Day 1–2: Foundations

- Workspace + auth
- DB schema + migrations
- Basic UI shell

### Day 3: Sentry ingestion

- Webhook endpoint
- Store AlertEvent
- Create AlertGroup with dedup

### Day 4: Slack integration

- OAuth connect
- Post alert notification
- Notification logs

### Day 5: ACK/Snooze/Resolve

- Slack interactive buttons
- Update AlertGroup status

### Day 6: Routing rules

- Simple rule builder
- Evaluate + route

### Day 7: Dashboard + delivery health

- Overview metrics
- Integration health checks

---

## 16) What you pitch after MVP

You’ll sell outcomes, not features:

- “We reduced alert noise by X%.”
- “Your team gets paged only for actionable incidents.”
- “No more ‘client told us first’ incidents.”

Then add paid upgrades:

- Datadog/Grafana integrations
- PagerDuty/Opsgenie
- On-call schedules
- Incident postmortems + action item tracking

---

## 17) Demo script (5 minutes)

1. Trigger a Sentry error in demo app
2. Show it appear in Alert Inbox
3. Show it grouped (count increments)
4. Show Slack notification with buttons
5. Click ACK in Slack → status updates in app
6. Show routing rule change (prod high → #oncall)

---

## 18) Acceptance criteria (MVP is “done” when)

- You can connect Slack + receive interactive button callbacks
- You can ingest Sentry alerts and group them
- You can route to Slack based on at least 3 rule conditions
- You can show delivery health + notification logs

---
