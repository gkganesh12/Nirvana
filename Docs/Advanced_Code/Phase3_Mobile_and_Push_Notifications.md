# Phase 3: Mobile & Push Notifications (Month 3)

> **Priority**: 🟢 MEDIUM-HIGH - Table stakes for alerting platform

## Overview

Mobile notifications are **essential** for an alerting platform. On-call engineers need to receive critical alerts wherever they are, not just when at their desk. This phase adds native mobile app support and push notifications.

---

## 🎯 Objectives

1. **Build React Native mobile app** (iOS + Android)
2. **Implement push notifications** (Firebase/APNS)
3. **Add SMS fallback** for critical alerts (Twilio)
4. **Create phone call escalation** for unacknowledged critical alerts
5. **Real-time alert updates** via WebSocket
6. **Mobile-optimized alert management**
7. **Biometric authentication** for security

---

## 1. Mobile App Architecture

### 1.1 Technology Stack

- **Framework**: React Native (Expo)
- **State Management**: Zustand
- **API Client**: TanStack Query (React Query)
- **Navigation**: React Navigation
- **Push Notifications**: Expo Notifications + Firebase Cloud Messaging
- **WebSockets**: Socket.IO React Native client
- **Authentication**: Clerk React Native SDK

### 1.2 Project Setup

```bash
# Create Expo app
npx create-expo-app@latest apps/mobile --template blank-typescript

cd apps/mobile

# Install dependencies
npm install @clerk/clerk-expo \
  @tanstack/react-query \
  @react-navigation/native \
  @react-navigation/stack \
  @react-navigation/bottom-tabs \
  expo-notifications \
  expo-device \
  expo-constants \
  expo-secure-store \
  expo-local-authentication \
  socket.io-client \
  zustand \
  react-native-gesture-handler \
  react-native-reanimated \
  react-native-safe-area-context \
  react-native-screens
```

### 1.3 App Structure

```
apps/mobile/
├── app/
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── _layout.tsx
│   ├── (tabs)/
│   │   ├── alerts.tsx
│   │   ├── on-call.tsx
│   │   ├── settings.tsx
│   │   └── _layout.tsx
│   ├── alert/[id].tsx
│   ├── _layout.tsx
│   └── index.tsx
├── components/
│   ├── AlertCard.tsx
│   ├── AlertDetail.tsx
│   ├── PushNotificationHandler.tsx
│   └── WebSocketProvider.tsx
├── hooks/
│   ├── useAlerts.ts
│   ├── usePushNotifications.ts
│   └── useWebSocket.ts
├── services/
│   ├── api.ts
│   ├── notifications.ts
│   └── websocket.ts
├── store/
│   └── alertStore.ts
└── app.json
```

---

## 2. Push Notifications Implementation

### 2.1 Backend: Notification Service

**Install Firebase Admin SDK**:
```bash
npm install --workspace @signalcraft/api firebase-admin
```

**Create push notification service**:
```typescript
// apps/api/src/notifications/push-notification.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private readonly fcm: admin.messaging.Messaging;

  constructor(private configService: ConfigService) {
    // Initialize Firebase Admin
    const serviceAccount = JSON.parse(
      this.configService.get('FIREBASE_SERVICE_ACCOUNT_JSON')
    );

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    this.fcm = admin.messaging();
  }

  async sendPushNotification(
    deviceToken: string,
    alert: {
      title: string;
      body: string;
      alertId: string;
      severity: string;
    }
  ): Promise<void> {
    try {
      const message: admin.messaging.Message = {
        token: deviceToken,
        notification: {
          title: alert.title,
          body: alert.body,
        },
        data: {
          alertId: alert.alertId,
          severity: alert.severity,
          type: 'alert',
        },
        android: {
          priority: alert.severity === 'CRITICAL' ? 'high' : 'normal',
          notification: {
            sound: alert.severity === 'CRITICAL' ? 'critical_alert' : 'default',
            channelId: alert.severity === 'CRITICAL' ? 'critical_alerts' : 'alerts',
            priority: alert.severity === 'CRITICAL' ? 'max' : 'high',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: alert.title,
                body: alert.body,
              },
              sound: alert.severity === 'CRITICAL' ? 'critical.wav' : 'default',
              badge: 1,
              'interruption-level': alert.severity === 'CRITICAL' ? 'critical' : 'active',
            },
          },
        },
      };

      const response = await this.fcm.send(message);
      this.logger.log(`Push notification sent: ${response}`);

      // Log notification
      await prisma.notificationLog.create({
        data: {
          workspaceId: alert.workspaceId,
          target: 'PUSH',
          targetRef: deviceToken,
          alertGroupId: alert.alertId,
          status: 'SENT',
          sentAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error.message}`);
      
      await prisma.notificationLog.create({
        data: {
          workspaceId: alert.workspaceId,
          target: 'PUSH',
          targetRef: deviceToken,
          alertGroupId: alert.alertId,
          status: 'FAILED',
          errorMessage: error.message,
          sentAt: new Date(),
        },
      });

      throw error;
    }
  }

  async sendBulkNotifications(
    tokens: string[],
    alert: any
  ): Promise<{ successCount: number; failureCount: number }> {
    const messages: admin.messaging.Message[] = tokens.map(token => ({
      token,
      notification: {
        title: alert.title,
        body: alert.body,
      },
      data: {
        alertId: alert.alertId,
        severity: alert.severity,
      },
    }));

    const response = await this.fcm.sendEach(messages);
    
    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  }
}
```

**Device Token Management**:
```typescript
// apps/api/src/users/device-token.service.ts
@Injectable()
export class DeviceTokenService {
  async registerToken(
    userId: string,
    deviceToken: string,
    platform: 'ios' | 'android'
  ): Promise<void> {
    await prisma.deviceToken.upsert({
      where: {
        userId_token: {
          userId,
          token: deviceToken,
        },
      },
      update: {
        platform,
        lastUsedAt: new Date(),
      },
      create: {
        userId,
        token: deviceToken,
        platform,
        createdAt: new Date(),
        lastUsedAt: new Date(),
      },
    });
  }

  async getActiveTokens(userId: string): Promise<string[]> {
    const tokens = await prisma.deviceToken.findMany({
      where: {
        userId,
        // Only tokens used in last 30 days
        lastUsedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    return tokens.map(t => t.token);
  }

  async removeToken(userId: string, token: string): Promise<void> {
    await prisma.deviceToken.delete({
      where: {
        userId_token: { userId, token },
      },
    });
  }
}
```

**Add DeviceToken model to Prisma**:
```prisma
// packages/database/prisma/schema.prisma
model DeviceToken {
  id         String   @id @default(cuid())
  userId     String
  token      String
  platform   String   // 'ios' or 'android'
  createdAt  DateTime @default(now())
  lastUsedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, token])
  @@index([userId])
  @@index([lastUsedAt])
}
```

### 2.2 Mobile App: Push Notification Setup

**Configure Expo for push notifications**:
```json
// apps/mobile/app.json
{
  "expo": {
    "name": "SignalCraft",
    "slug": "signalcraft",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "signalcraft",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff",
          "sounds": ["./assets/sounds/critical.wav"]
        }
      ]
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.signalcraft.app",
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.signalcraft.app",
      "googleServicesFile": "./google-services.json",
      "permissions": [
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE"
      ]
    }
  }
}
```

**Push notification handler**:
```typescript
// apps/mobile/hooks/usePushNotifications.ts
import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import { api } from '../services/api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const severity = notification.request.content.data?.severity;
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      // Critical alerts are always shown, even in DND
      priority: severity === 'CRITICAL' 
        ? Notifications.AndroidNotificationPriority.MAX 
        : Notifications.AndroidNotificationPriority.HIGH,
    };
  },
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState<Notifications.Notification>();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();
  const { getToken } = useAuth();

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        // Register token with backend
        registerTokenWithBackend(token);
      }
    });

    // Listen for notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(
      notification => {
        setNotification(notification);
      }
    );

    // Handle notification interactions
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      response => {
        const alertId = response.notification.request.content.data?.alertId;
        if (alertId) {
          // Navigate to alert detail
          router.push(`/alert/${alertId}`);
        }
      }
    );

    return () => {
      notificationListener.current && 
        Notifications.removeNotificationSubscription(notificationListener.current);
      responseListener.current && 
        Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('critical_alerts', {
        name: 'Critical Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'critical.wav',
        enableVibrate: true,
        enableLights: true,
        lightColor: '#FF0000',
      });

      await Notifications.setNotificationChannelAsync('alerts', {
        name: 'Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        alert('Failed to get push notification permissions!');
        return;
      }
      
      token = (await Notifications.getExpoPushTokenAsync()).data;
    } else {
      alert('Must use physical device for push notifications');
    }

    return token;
  }

  async function registerTokenWithBackend(token: string) {
    try {
      const authToken = await getToken();
      await api.post('/users/device-token', {
        token,
        platform: Platform.OS,
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
    } catch (error) {
      console.error('Failed to register device token:', error);
    }
  }

  return {
    expoPushToken,
    notification,
  };
}
```

---

## 3. SMS Notifications (Twilio)

### 3.1 Backend Setup

```bash
npm install --workspace @signalcraft/api twilio
```

```typescript
// apps/api/src/notifications/sms-notification.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

@Injectable()
export class SmsNotificationService {
  private readonly logger = new Logger(SmsNotificationService.name);
  private readonly client: twilio.Twilio;
  private readonly fromNumber: string;

  constructor(private configService: ConfigService) {
    this.client = twilio(
      configService.get('TWILIO_ACCOUNT_SID'),
      configService.get('TWILIO_AUTH_TOKEN')
    );
    this.fromNumber = configService.get('TWILIO_PHONE_NUMBER');
  }

  async sendSms(to: string, message: string): Promise<void> {
    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: to,
      });

      this.logger.log(`SMS sent: ${result.sid}`);
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error.message}`);
      throw error;
    }
  }

  async sendAlertSms(
    phoneNumber: string,
    alert: {
      title: string;
      severity: string;
      environment: string;
      alertId: string;
    }
  ): Promise<void> {
    const message = `
🚨 [${alert.severity}] Alert in ${alert.environment}

${alert.title}

View: https://app.signalcraft.com/alert/${alert.alertId}

Reply STOP to disable SMS alerts
`.trim();

    await this.sendSms(phoneNumber, message);
  }
}
```

---

## 4. Phone Call Escalation

```typescript
// apps/api/src/notifications/voice-notification.service.ts
import { Injectable, Logger } from '@nestjs/common';
import twilio from 'twilio';

@Injectable()
export class VoiceNotificationService {
  private readonly client: twilio.Twilio;

  constructor(private configService: ConfigService) {
    this.client = twilio(
      configService.get('TWILIO_ACCOUNT_SID'),
      configService.get('TWILIO_AUTH_TOKEN')
    );
  }

  async makeAlertCall(
    phoneNumber: string,
    alert: {
      title: string;
      severity: string;
    }
  ): Promise<void> {
    try {
      const call = await this.client.calls.create({
        to: phoneNumber,
        from: this.configService.get('TWILIO_PHONE_NUMBER'),
        twiml: `
          <Response>
            <Say voice="alice" language="en-US">
              This is SignalCraft. 
              You have a ${alert.severity} alert: ${alert.title}.
              Press 1 to acknowledge, or 2 to snooze for one hour.
            </Say>
            <Gather numDigits="1" action="/api/voice/handle-response">
              <Say>Please press a key.</Say>
            </Gather>
          </Response>
        `,
      });

      this.logger.log(`Voice call initiated: ${call.sid}`);
    } catch (error) {
      this.logger.error(`Failed to make call: ${error.message}`);
    }
  }

  async handleVoiceResponse(
    digit: string,
    alertId: string
  ): Promise<string> {
    if (digit === '1') {
      // Acknowledge alert
      await this.alertsService.acknowledgeAlert(alertId);
      return `<Response><Say>Alert acknowledged. Thank you.</Say></Response>`;
    } else if (digit === '2') {
      // Snooze alert
      await this.alertsService.snoozeAlert(alertId, 60);
      return `<Response><Say>Alert snoozed for one hour.</Say></Response>`;
    }

    return `<Response><Say>Invalid option. Goodbye.</Say></Response>`;
  }
}
```

---

## 5. Escalation Policy

```typescript
// apps/api/src/escalations/escalation-policy.service.ts
@Injectable()
export class EscalationPolicyService {
  async executeEscalation(alertGroupId: string): Promise<void> {
    const alertGroup = await prisma.alertGroup.findUnique({
      where: { id: alertGroupId },
      include: { workspace: { include: { users: true } } },
    });

    if (!alertGroup || alertGroup.status !== 'OPEN') {
      return;
    }

    const severity = alertGroup.severity;
    const unacknowledgedMinutes = differenceInMinutes(
      new Date(),
      alertGroup.firstSeenAt
    );

    // Escalation levels based on time and severity
    if (severity === 'CRITICAL') {
      if (unacknowledgedMinutes >= 1) {
        // Level 1: Push + SMS
        await this.sendPushAndSms(alertGroup);
      }
      if (unacknowledgedMinutes >= 5) {
        // Level 2: Phone call to on-call engineer
        await this.makePhoneCall(alertGroup);
      }
      if (unacknowledgedMinutes >= 10) {
        // Level 3: Call backup engineer
        await this.callBackup(alertGroup);
      }
    } else if (severity === 'HIGH') {
      if (unacknowledgedMinutes >= 15) {
        await this.sendPushAndSms(alertGroup);
      }
      if (unacknowledgedMinutes >= 30) {
        await this.makePhoneCall(alertGroup);
      }
    }
  }

  private async sendPushAndSms(alertGroup: any): Promise<void> {
    const onCallUser = await this.getOnCallUser(alertGroup.workspaceId);
    
    if (!onCallUser) return;

    // Push notification
    const deviceTokens = await this.deviceTokenService.getActiveTokens(onCallUser.id);
    for (const token of deviceTokens) {
      await this.pushNotificationService.sendPushNotification(token, {
        title: alertGroup.title,
        body: `${alertGroup.count} occurrences in ${alertGroup.environment}`,
        alertId: alertGroup.id,
        severity: alertGroup.severity,
        workspaceId: alertGroup.workspaceId,
      });
    }

    // SMS
    if (onCallUser.phoneNumber) {
      await this.smsNotificationService.sendAlertSms(
        onCallUser.phoneNumber,
        alertGroup
      );
    }
  }

  private async makePhoneCall(alertGroup: any): Promise<void> {
    const onCallUser = await this.getOnCallUser(alertGroup.workspaceId);
    
    if (onCallUser?.phoneNumber) {
      await this.voiceNotificationService.makeAlertCall(
        onCallUser.phoneNumber,
        alertGroup
      );
    }
  }
}
```

---

## 6. Mobile App UI

### 6.1 Alert List Screen

```tsx
// apps/mobile/app/(tabs)/alerts.tsx
import { FlatList, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { AlertCard } from '../../components/AlertCard';
import { useAlerts } from '../../hooks/useAlerts';

export default function AlertsScreen() {
  const { data, isLoading, refetch, isRefreshing } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.get('/alerts'),
    refetchInterval: 30000, // Refresh every 30s
  });

  // Real-time updates via WebSocket
  useWebSocket({
    onAlertUpdate: (alert) => {
      queryClient.invalidateQueries(['alerts']);
    },
  });

  return (
    <View style={styles.container}>
      <FlatList
        data={data?.alerts || []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AlertCard
            alert={item}
            onPress={() => router.push(`/alert/${item.id}`)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refetch}
          />
        }
        ListEmptyComponent={
          <EmptyState message="No alerts" />
        }
      />
    </View>
  );
}
```

### 6.2 Alert Detail Screen

```typescript
// apps/mobile/app/alert/[id].tsx
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';

export default function AlertDetailScreen() {
  const { id } = useLocalSearchParams();
  
  const { data: alert } = useQuery({
    queryKey: ['alert', id],
    queryFn: () => api.get(`/alerts/${id}`),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: () => api.post(`/alerts/${id}/acknowledge`),
    onSuccess: () => {
      queryClient.invalidateQueries(['alert', id]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  if (!alert) return <LoadingSpinner />;

  return (
    <ScrollView>
      <AlertHeader
        title={alert.title}
        severity={alert.severity}
        status={alert.status}
      />
      
      <AlertMetadata
        environment={alert.environment}
        project={alert.project}
        count={alert.count}
        firstSeen={alert.firstSeenAt}
        lastSeen={alert.lastSeenAt}
      />

      <AlertActions>
        <Button
          title="Acknowledge"
          onPress={() => acknowledgeMutation.mutate()}
          disabled={alert.status !== 'OPEN'}
        />
        <Button
          title="Snooze 1h"
          onPress={() => snoozeMutation.mutate({ duration: 60 })}
        />
        <Button
          title="Resolve"
          onPress={() => resolveMutation.mutate()}
        />
      </AlertActions>

      <EventTimeline events={alert.events} />
    </ScrollView>
  );
}
```

---

## 📊 Success Metrics

- [ ] Mobile app deployed to App Store + Google Play
- [ ] Push notifications delivered in < 5 seconds
- [ ] SMS delivery 99%+ success rate
- [ ] Phone call escalation functional
- [ ] Real-time updates via WebSocket
- [ ] Biometric auth enabled
- [ ] 4.5+ star rating on stores

---

## ⏱️ Timeline

**Week 1-2**: Mobile app core + navigation
**Week 3**: Push notifications implementation
**Week 4**: SMS/Voice + escalation policies

---

## ✅ Definition of Done

- Mobile app published to stores
- Push notifications working on iOS + Android
- SMS fallback functional
- Escalation policies tested
- User documentation created
