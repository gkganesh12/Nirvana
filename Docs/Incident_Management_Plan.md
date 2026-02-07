# SignalCraft Incident Management Lifecycle Plan

**Goal**: Elevate SignalCraft from an alerting tool to a full Incident Management platform, enabling teams to coordinate, resolve, and learn from outages efficiently.

## 1. War Rooms (Collaboration)

### Slack / MS Teams Channels
*   **Feature**: Auto-create dedicated channels for Critical incidents (e.g., `#inc-123-db-outage`).
*   **Implementation**:
    *   **Slack**: Use `conversations.create` API.
    *   **Invites**: Auto-invite On-Call engineers and subscribers.
    *   **Topic**: Set channel topic with Incident Title and Zoom link.
    *   **Archival**: Auto-archive channel after resolution and post-mortem.

### Conference Bridges
*   **Feature**: One-click or auto-generated video bridge.
*   **Implementation**:
    *   **Zoom**: OAuth integration to generate meeting URL.
    *   **Google Meet**: Calendar API or static personal room fallback.
    *   **URL Storage**: Store `conferenceUrl` on `AlertGroup` model.

## 2. Incident Roles & Command

### Explicit Roles
*   **Feature**: Assign clear responsibilities during an incident.
*   **Schema Changes**:
    *   New model `IncidentRoleAssignment`:
        *   `role`: COMMANDER, SCRIBE, LIAISON, TECH_LEAD.
        *   `userId`: Link to User.
        *   `alertGroupId`: Link to AlertGroup.

### Command Center UI
*   **Feature**: A dedicated "War Room" view in the dashboard.
*   **Components**:
    *   Active Roles list.
    *   Live Timeline (chat ops stream).
    *   Task list (ad-hoc tasks created during incident).

## 3. Post-Mortems (Learning)

### Automated Timeline
*   **Feature**: Auto-generate a timeline of events.
*   **Sources**:
    *   Alert triggered time.
    *   Status changes (Ack, Resolved).
    *   Deployment events (Correlation).
    *   Slack messages (Users can mark messages with 📌 reaction to add to timeline).

### Post-Mortem Document
*   **Feature**: Markdown report generator.
*   **Sections**:
    *   Summary.
    *   Impact (Duration, Users affected).
    *   Root Cause (5 Whys).
    *   Timeline.
    *   Action Items (Jira tickets).

## 4. Status Pages (Communication)

### Public / Private Pages
*   **Feature**: hosted status page (e.g., `status.example.com`).
*   **Implementation**:
    *   **Lightweight**: A public Next.js page in `@signalcraft/web`.
    *   **Integrations**: Push updates to Atlassian Statuspage or Cachet.

### Subscriber Notifications
*   **Feature**: Email/SMS updates to stakeholders.
*   **Logic**: "Notify Subscribers" button on Incident dashboard.

## 5. Implementation Roadmap

*   **Phase 1 (Collaboration)**: Slack Channel creation & Zoom links.
*   **Phase 2 (Structure)**: Incident Roles & Command Center UI.
*   **Phase 3 (Learning)**: Automated Timelines & Basic Post-Mortems.
*   **Phase 4 (Public)**: Status Page & External Comms.
