# SignalCraft Mobile Application Plan

**Goal**: Provide a native mobile experience for iOS and Android to ensure Engineers never miss a critical alert and can manage incidents on the go.

## 1. Core Requirements

1.  **Critical Alerts (Override DND)**:
    *   The app must be able to play a loud sound even if the phone is in "Do Not Disturb" or "Silent" mode.
    *   **iOS**: Requires `Critical Alerts` entitlement (needs Apple approval).
    *   **Android**: Notification Channels with `IMPORTANCE_HIGH` and bypassing DND.
2.  **Incident Management**:
    *   View Alert details (charts, logs).
    *   Actions: Acknowledge, Resolve, Snooze.
    *   Reassign / Escalate.
3.  **Push Notifications**:
    *   Reliable delivery using FCM (Firebase Cloud Messaging) / APNs.
4.  **Offline Support**:
    *   View cached data if network is spotty.

## 2. Technology Stack Options

### Option A: React Native (Recommended)
*   **Pros**:
    *   Shared language (TypeScript/React) with current Web frontend.
    *   Excellent ecosystem for Push Notifications (Expo / OneSignal).
    *   "Write Once, Run Everywhere".
*   **Cons**:
    *   Performance slightly lower than native (negligible for this use case).

### Option B: Flutter
*   **Pros**: Excellent performance, consistent UI.
*   **Cons**: Requires learning Dart; separate codebase from Web.

### Option C: Native (Swift / Kotlin)
*   **Pros**: Best possible integration with OS features (critical for DND override).
*   **Cons**: Double the development effort.

**Recommendation**: **React Native (Expo)** using `expo-notifications` and custom native modules for Critical Alert entitlement.

## 3. Architecture

### Backend Updates
*   **Push Service**:
    *   New service `PushNotificationService`.
    *   Integration with Firebase Cloud Messaging (FCM).
*   **Device Management**:
    *   `POST /api/v1/devices`: Register device token.
    *   `model Device { userId, token, platform, lastActiveAt }`.

### Mobile App Structure (React Native)
*   **Screens**:
    *   `LoginScreen`: Authentication (same as Web).
    *   `InboxScreen`: List of Open/Ack alerts.
    *   `AlertDetailScreen`: Full details + Action buttons.
    *   `SettingsScreen`: Notification preferences (sounds, schedules).

## 4. Implementation Phase 1: "The Pager"

Focus solely on the **Alerting** capability, not full Incident Management.

1.  **Repo Setup**: `apps/mobile` (React Native / Expo).
2.  **Auth**: Login with existing credentials.
3.  **Push**:
    *   Register device.
    *   Receive Standard Push Notification on new Alert.
4.  **Action**: "Tap to Ack" (simple API call).

## 5. Roadmap

*   **Phase 1**: "The Pager" (Receive Push, Simple Ack).
*   **Phase 2**: Critical Alerts (Sound override).
*   **Phase 3**: "The Manager" (Full Incident Management UI).
*   **Phase 4**: "On-Call" (View Schedule, Request Override).
