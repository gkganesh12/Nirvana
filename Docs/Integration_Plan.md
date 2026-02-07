# SignalCraft Integration Ecosystem Expansion Plan

**Goal**: Transform SignalCraft from a limited alerting tool into a central observability hub by expanding native integrations to cover major Cloud Providers, Ticketing Systems, and Monitoring platforms.

## 1. Cloud Providers (AWS, Azure, GCP)

### AWS CloudWatch
*   **Method**: AWS SNS to Webhook.
*   **Implementation**:
    *   Create a generic "AWS CloudWatch" integration type in `IntegrationType` enum.
    *   Endpoint: `/api/v1/webhooks/aws-cloudwatch`.
    *   Payload Parsing: Handle standard SNS JSON format, extract `AlarmName`, `NewStateValue`, `StateChangeTime`.
    *   Auth: Verify message signature (optional but recommended) or URL token.

### Azure Monitor
*   **Method**: Action Groups to Webhook.
*   **Implementation**:
    *   Endpoint: `/api/v1/webhooks/azure-monitor`.
    *   Payload Parsing: Common Alert Schema.

### GCP Cloud Monitoring
*   **Method**: Notification Channels (Webhook).
*   **Implementation**:
    *   Endpoint: `/api/v1/webhooks/gcp-monitoring`.
    *   Auth: Basic Auth or Token.

## 2. Ticketing & Incident Management (Bi-Directional)

### Jira / Jira Service Management
*   **Method**: OAuth2 or API Key + Webhooks.
*   **Implementation**:
    *   **Outbound (SignalCraft -> Jira)**:
        *   Action: "Create Jira Ticket" button on Alert Group.
        *   Automation: Rule to auto-create ticket for Critical alerts.
    *   **Inbound (Jira -> SignalCraft)**:
        *   Webhook to sync status (Ticket Closed -> Alert Resolved).

### ServiceNow
*   **Method**: REST API.
*   **Implementation**: Enterprise-grade structure, likely requires a dedicated "Incident" table mapping.

## 3. Generic & Other Monitoring Tools

### Prometheus / Alertmanager
*   **Method**: Webhook.
*   **Implementation**:
    *   Alertmanager supports generic webhooks.
    *   Format: Standard Prometheus JSON.
    *   Grouping: Alertmanager already groups, we need to respect that or re-group.

### Grafana
*   **Method**: Webhook Contact Point.
*   **Implementation**:
    *   Parse Grafana 8/9/10 alert payloads (multidimensional).
    *   Support embedding of snapshot images if possible.

## 4. Architecture Updates Needed

1.  **Generic Webhook Ingestor**:
    *   Instead of writing a custom controller for every service, create a `WebhookIngestionService` that uses a Strategy Pattern based on `source` type.
    *   `POST /api/webhooks/:source?token=xyz`

2.  **Schema Changes (`schema.prisma`)**:
    *   Update `IntegrationType` enum: `AWS_CLOUDWATCH`, `JIRA`, `PROMETHEUS`, `GRAFANA`, `GENERIC_WEBHOOK`.
    *   Config JSON needs to be flexible for OAuth tokens (Jira) vs simple webhook URLs.

3.  **UI Updates**:
    *   "Integrations" page needs a catalog view (grid of logos) instead of a simple list.
    *   Setup guides/wizards for each integration (e.g., "Copy this URL and paste it into AWS SNS").

## 5. Roadmap

*   **Phase 1 (Quick Wins)**: AWS CloudWatch & Prometheus (highest volume sources).
*   **Phase 2 (Workflow)**: Jira Integration (closing the loop).
*   **Phase 3 (Long tail)**: Azure, GCP, Generic Webhooks.
