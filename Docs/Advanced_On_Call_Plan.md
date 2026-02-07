# SignalCraft Advanced On-Call Logic Plan

**Goal**: Implement enterprise-grade scheduling capabilities to support complex team structures, "follow-the-sun" global rotations, and seamless calendar integrations.

## 1. Complex Rotation Logic

### "Follow-the-Sun" & Shift Patterns
*   **Current State**: Basic cyclic rotation (Person A -> Person B -> Person A) based on `handoffIntervalHours`.
*   **Missing**: "Time-of-day" restrictions.
*   **Feature**: Ability to define shifts like "London Day (09:00-17:00 LDN)", "NY Day (09:00-17:00 EST)", "Sydney Day".
*   **Implementation**:
    *   Add `restrictionsJson` to `OnCallLayer`.
    *   Logic: checks `isLayerActive(layer, currentTime)` before paging.
    *   Fallback: Must define a "Catch-all" layer if gaps exist.

### Multi-Layered Schedules
*   **Feature**: Primary, Secondary (Backup), and Shadow (Learning) layers.
*   **Implementation**:
    *   Schema already supports `OnCallLayer`.
    *   **Routing Logic Update**: If Primary does not ACK within `X` minutes, escalate to Secondary Layer (currently escalates to next Step, but simpler to link Layers).

## 2. Temporary Overrides & Coverage

### Vacation/Out-of-Office Logic
*   **Feature**: "I need coverage from date X to Y".
*   **UI**: "Take Shift" marketplace or Direct Assignment.
*   **Implementation**:
    *   Refine `OnCallOverride` implementation.
    *   UI: Drag-and-drop on calendar to swap shifts.

### Calendar Exceptions
*   **Feature**: Skip holidays affecting specific regions involved in the rotation.

## 3. Calendar Integration (Bi-Directional)

### Subscriptions (iCal)
*   **Feature**: "Export to Google Calendar" / "Subscribe to My Shifts".
*   **Implementation**:
    *   Endpoint: `/api/v1/oncall/:userId/schedule.ics`.
    *   Library: `ical-generator`.
    *   Security: Signed token in URL.

### User Availability (Reverse Sync)
*   **Feature**: Warn if assigned on-call during a "Busy" calendar block (e.g., OOO).
*   **Implementation**:
    *   Google Calendar API / Microsoft Graph API integration.
    *   Periodic sync or webhook update to check for "Out of Office" events.

## 4. Mobile "Wake Up" Routing

### Push Notifications
*   **Feature**: Critical bypass for iOS/Android DND modes.
*   **Implementation**:
    *   Requires Native App (as noted in Mobile Gap).
    *   Interim: ₹SMS / Voice Call (Twilio/Vonage integration).
    *   **Twilio Integration**:
        *   Voice: Text-to-Speech call saying "Critical Alert on SignalCraft. Press 1 to Acknowledge."
        *   SMS: "Reply 123 to ACK."

## 5. Schema Updates Required

```prisma
model OnCallLayer {
  // Existing fields...
  // Additions:
  restrictionsJson Json? // { "days": ["MON", "TUE"], "startTime": "09:00", "endTime": "17:00", "timezone": "Europe/London" }
  isShadow         Boolean @default(false) // If true, notify but don't wait for ACK
}

// New Model for Calendar Feeds
model UserCalendarFeed {
  id        String @id @default(cuid())
  userId    String
  urlSlug   String @unique // Secret slug for ical feed
  // ...
}
```

## 6. Implementation Stages

*   **Stage 1 (Overrides)**: Robust Drag-and-Drop Override UI.
*   **Stage 2 (Notifications)**: Twilio Voice/SMS integration for "Wake up".
*   **Stage 3 (Shifts)**: Time-restricted layers for Follow-the-Sun.
*   **Stage 4 (Cal Sync)**: Export to iCal/GCal.
