# Gap Implementation Plan

This document lists the missing capabilities relative to industry alerting/paging tools (PagerDuty/Opsgenie/Datadog Incident Management) and proposes concrete implementation steps for SignalCraft.

## 1) On-call and Paging (Highest Priority)

- **Backend**: add `oncall` module (rotations, schedules, overrides, handoffs) with entities: Rotation, ScheduleLayer, RotationParticipant, Override, Handoff, PagingPolicy.
- **Channels**: extend Notifications to support SMS/voice (Twilio) and push (mobile/PWA later); keep Slack/Email as existing.
- **Escalation policy**: add multi-layer rules (primary/secondary) with retry/backoff; integrate with Queue jobs for timed escalations.
- **UI**: replace mock on-call page with live CRUD for rotations, overrides, and policy previews; add “page user” action from alert detail.
- **Audit**: log paging attempts and acknowledgements; expose to UI.

## 2) Integration Coverage

- **Provider abstraction**: create `integrations` provider registry with per-type validators and secrets storage.
- **New sources (phase order)**:
  1. Prometheus Alertmanager (for SLO burn alerts)
  2. CloudWatch Alarms
  3. Grafana/Loki alerts
  4. GitHub/GitLab deploy events (change events)
- **Testing**: contract tests with sample payloads per provider; signature/token validation parity with Sentry/Datadog.

## 3) Notification Reliability and Delivery Health

- **Delivery health metrics**: track per-target success/failure, latency, and retry counts; store in NotificationLog with status enums.
- **Retry/backoff**: implement exponential backoff and channel failover (Slack → Email → SMS/Voice for critical severities).
- **Health checks**: periodic token validity tests and Slack channel reachability; surface in dashboard.
- **UI**: delivery health widget + per-alert delivery trail.

## 4) Incident Lifecycle and Collaboration

- **Incident model**: elevate AlertGroup to Incident with states (open/ack/mitigated/resolved/closed) and roles (commander, scribe, comms).
- **Timeline**: append events (ingest, route, ack, escalation, resolution, postmortem created) with actor metadata.
- **Stakeholder comms**: templates for Slack status posts and email updates; optional public status page export.
- **Bridges**: link to Zoom/Meet/Slack huddle per incident.

## 5) Service Catalog, Runbooks, and Auto-remediation

- **Service catalog**: add Service entity (owner team, Slack channel, repo link, runbook URLs, SLOs) and map alerts to services.
- **Runbooks**: attach runbook links per routing rule and per service; show inline in alert detail.
- **Auto-remediation hooks**: allow secure, approved actions (webhooks or queue-dispatched scripts) gated by RBAC and audit.

## 6) Platform Observability (Meta-Observability)

- **Metrics/tracing**: instrument Nest + BullMQ with OpenTelemetry exporters (Prometheus/OTLP). Track ingest latency, queue depth, processing time, notification success rates, dedup effectiveness.
- **Dashboards**: ship Grafana/Prometheus starter dashboards for operators.
- **Alerts on alerts**: trigger internal alerts when ingest stalls, queue backs up, or delivery failure rate exceeds threshold.

## 7) Testing and Quality

- **Unit**: rule evaluation, dedup/group-key, escalation scheduling, notification retry logic, provider validators.
- **Contract**: per-integration webhook payload fixtures; golden tests for normalized alert schema.
- **E2E**: webhook → grouping → routing → Slack action → resolution; paging policy with retries.

## Proposed Milestones (4–5 weeks)

- **Week 1**: On-call backend (rotations/policies) + notification reliability (retry/backoff) + delivery metrics plumbing.
- **Week 2**: Prometheus + CloudWatch integrations; UI for on-call CRUD; basic delivery health dashboard.
- **Week 3**: Incident timeline/roles, stakeholder comms templates, service catalog + runbook surfaces.
- **Week 4**: Auto-remediation hooks, meta-observability (OTEL + dashboards), alert-on-alerts.
- **Week 5**: Hardening and tests (unit/contract/E2E), docs, and rollout toggles.

## Rollout and Safety

- Feature flags per module (on-call, new providers, auto-remediation).
- RBAC enforcement for paging and remediation actions.
- Secrets via Secrets Manager; per-provider token validation on save.
