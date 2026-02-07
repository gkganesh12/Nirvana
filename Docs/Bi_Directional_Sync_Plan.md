# SignalCraft Bi-Directional Sync Plan

**Goal**: Ensure state consistency across the entire observability stack. If an alert is acknowledged or resolved in one tool (e.g., Datadog), that state should propagate to SignalCraft and all other connected tools (e.g., Jira, Slack), and vice-versa.

## 1. The Challenge: avoiding "Ping-Pong" Loops

*   **Problem**: Tool A updates Tool B -> Tool B webhook fires -> Tool A updates again.
*   **Solution**: "Echo Prevention" logic.
    *   **Source of Truth Tracking**: Every state change must carry a `source` (e.g., `user:123`, `integration:datadog`).
    *   **Idempotency**: If `new_status == current_status`, do nothing and emit no events.

## 2. Architecture: `SyncManager` Service

A central service responsible for propagating state changes.

### Database Schema Updates

```prisma
model ExternalMapping {
  id           String @id @default(cuid())
  alertGroupId String
  integrationType IntegrationType // DATADOG, JIRA, PAGERDUTY
  externalId   String // The ID in the remote system (e.g., Datadog Incident ID)
  metadata     Json   // Store last known state or sync tokens
  
  alertGroup   AlertGroup @relation(fields: [alertGroupId], references: [id])
  
  @@unique([alertGroupId, integrationType])
  @@index([externalId])
}
```

## 3. Implementation Flows

### Inbound Sync (External -> SignalCraft)
*   **Scenario**: User resolves an incident in Datadog.
*   **Flow**:
    1.  Datadog sends webhook to `/api/webhooks/datadog`.
    2.  SignalCraft looks up `ExternalMapping` by `externalId`.
    3.  If found, `AlertGroupService.resolve(id, source='datadog')`.
    4.  Logic checks: Is it already resolved? Yes -> Stop. No -> Update DB.

### Outbound Sync (SignalCraft -> External)
*   **Scenario**: User clicks "Ack" in SignalCraft Slack bot.
*   **Flow**:
    1.  `AlertService` updates status to `ACK`.
    2.  `SyncManager` subscribes to `AlertUpdated` event.
    3.  `SyncManager` finds all `ExternalMapping`s for this AlertGroup.
    4.  For each mapping (e.g., Jira Ticket #101, Datadog Alert #55):
        *   Call `JiraAdapter.updateStatus(#101, 'In Progress')`.
        *   Call `DatadogAdapter.resolve(#55)` (if logic dictates).

## 4. Conflict Resolution Strategies

*   **Latest Wins**: Simple timestamp comparison.
*   **SignalCraft Authority**: SignalCraft state always overrides external state (strict).
*   **Source Authority**: External tools are read-only sources; SignalCraft reflects them but doesn't write back (safest start).

## 5. Roadmap

*   **Phase 1 (One-Way)**: Perfect the "Inbound" sync. Ensure existing integrations (PagerDuty/Datadog) correctly resolve SignalCraft alerts.
*   **Phase 2 (Mapping)**: Implement `ExternalMapping` table to reliably link IDs.
*   **Phase 3 (Outbound)**: Implement "Write Back" logic for major integrations (Jira, Datadog).
