# SignalCraft Proactive AI & Intelligence Plan

**Goal**: Shift SignalCraft from *reactive* alerting to *proactive* incident prevention using Anomaly Detection and Deep Contextual Analysis.

## 1. Anomaly Detection (Predictive)

### Metric & Log Anomaly Scoring
*   **Concept**: Detect when metric volume or log error rates deviate significantly from the norm (z-score / seasonality) *before* a hard threshold is breached.
*   **Implementation**:
    *   **Data Source**: Ingested events (SignalCraft `AlertEvent` stream) + optional external metric streams (Prometheus/Datadog).
    *   **Algorithm**:
        *   **Basic**: Rolling window Z-Score (Mean/StdDev).
        *   **Advanced**: Holt-Winters Forecasting (for seasonality).
    *   **Action**: Create "Warning" level alerts automatically: "High Error Velocity Detected (3σ above normal)".

### "Silence" Intelligence
*   **Concept**: "You usually silence alarms from this service on Tuesdays. Do you want to auto-snooze?"
*   **Implementation**:
    *   Analyze `AuditLog` for snooze patterns.
    *   Suggest new `RoutingRule` or `InhibitionRule`.

## 2. Root Cause Analysis (Contextual)

### Deployment Correlation
*   **Concept**: "This alert started 2 minutes after Release v2.4 was deployed."
*   **Implementation**:
    *   Deepen `Release` model integration.
    *   **Logic**: When `AlertGroup` is created, query most recent `Release` (within T-15 mins) for the same `project`/`environment`.
    *   **UI**: Highlight "Suspect Deployment" prominently on the Incident page.

### Change Events (Audit Trails)
*   **Concept**: Correlate alerts with flag toggles or config changes.
*   **Implementation**:
    *   Ingest "Change Events" (e.g., LaunchDarkly webhook, K8s config change).
    *   Store in `TimeBlockedEvents` table.
    *   Overlay these events on the Alert chart.

## 3. Generative AI "SRE Copilot"

### Enhanced Resolution Suggestions (RAG)
*   **Current**: Basic RAG on past resolutions.
*   **Upgrade**:
    *   **Context**: Include recent logs, deployment diffs, and similar alerts from *other* projects.
    *   **Runbook Generation**: "Draft a Runbook for this recurring issue."

### Natural Language Querying (ChatOps)
*   **Feature**: "Show me all high-latency alerts from the last 24h related to the payments service."
*   **Implementation**:
    *   Text-to-SQL or Text-to-Prisma query generation.
    *   Interface: Chat bot in Command Center (War Room).

## 4. Architecture Updates

```prisma
model AnomalyModel {
  id          String   @id @default(cuid())
  workspaceId String
  metricKey   String   // e.g. "error_rate:service_a"
  baseline    Json     // Store mean/stddev/seasonality params
  lastUpdated DateTime
  // ...
}

model ChangeEvent {
  id          String   @id @default(cuid())
  workspaceId String
  type        String   // "deployment", "flag_change", "config_update"
  source      String   // "github", "launchdarkly"
  details     Json
  timestamp   DateTime
  
  // Relations to correlate with Alerts
}
```

## 5. Roadmap

*   **Phase 1 (Context)**: Deployment Correlation (Low effort, High value).
*   **Phase 2 (Prediction)**: Basic Z-Score Anomaly Detection on Event Volume.
*   **Phase 3 (Copilot)**: Advanced RAG with Runbook drafting.
