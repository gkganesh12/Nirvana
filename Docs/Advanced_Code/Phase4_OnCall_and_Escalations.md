# Phase 4: On-Call & Escalations (Month 4)

> **Priority**: 🟢 MEDIUM - Competitive feature requirement

## Overview

Build comprehensive on-call management system with rotating schedules, override handling, and multi-level escalation policies similar to PagerDuty/Opsgenie.

---

## 🎯 Objectives

1. **On-call schedule builder** with rotations
2. **Calendar integration** (Google Calendar, Outlook)
3. **Override management** (vacations, swaps)
4. **Multi-level escalation policies**
5. **On-call handoff notes**
6. **On-call analytics** (response times, burnout metrics)
7. **Shift notifications** (upcoming on-call reminders)

---

## 1. Database Schema

```prisma
// packages/database/prisma/schema.prisma

model OnCallSchedule {
  id              String   @id @default(cuid())
  workspaceId     String
  name            String
  description     String?
  timezone        String   @default("UTC")
  rotationType    String   // DAILY, WEEKLY, CUSTOM
  rotationStartAt DateTime
  enabled         Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  workspace  Workspace           @relation(fields: [workspaceId], references: [id])
  shifts     OnCallShift[]
  overrides  OnCallOverride[]
  escalation EscalationPolicy[]

  @@index([workspaceId])
}

model OnCallShift {
  id         String   @id @default(cuid())
  scheduleId String
  userId     String
  startAt    DateTime
  endAt      DateTime
  notes      String?  @db.Text
  createdAt  DateTime @default(now())

  schedule OnCallSchedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  user     User            @relation(fields: [userId], references: [id])

  @@index([scheduleId, startAt, endAt])
  @@index([userId, startAt])
}

model OnCallOverride {
  id         String   @id @default(cuid())
  scheduleId String
  userId     String   // Who is taking over
  startAt    DateTime
  endAt      DateTime
  reason     String?
  createdBy  String
  createdAt  DateTime @default(now())

  schedule OnCallSchedule @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  user     User            @relation("OnCallUser", fields: [userId], references: [id])
  creator  User            @relation("OverrideCreator", fields: [createdBy], references: [id])

  @@index([scheduleId, startAt, endAt])
}

model EscalationPolicy {
  id          String   @id @default(cuid())
  workspaceId String
  scheduleId  String?
  name        String
  description String?
  levels      Json     // Array of escalation levels
  enabled     Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workspace Workspace       @relation(fields: [workspaceId], references: [id])
  schedule  OnCallSchedule? @relation(fields: [scheduleId], references: [id])

  @@index([workspaceId])
}

model OnCallHandoff {
  id             String   @id @default(cuid())
  workspaceId    String
  scheduleId     String
  fromUserId     String
  toUserId       String
  notes          String   @db.Text
  activeIncidents Json?   // Snapshot of active alerts
  createdAt      DateTime @default(now())

  workspace Workspace @relation(fields: [workspaceId], references: [id])
  fromUser  User      @relation("HandoffFrom", fields: [fromUserId], references: [id])
  toUser    User      @relation("HandoffTo", fields: [toUserId], references: [id])

  @@index([workspaceId, createdAt])
}
```

---

## 2. On-Call Schedule Service

```typescript
// apps/api/src/on-call/schedule.service.ts
import { Injectable } from '@nestjs/common';
import { addDays, addWeeks, startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class OnCallScheduleService {
  async createRotatingSchedule(
    workspaceId: string,
    config: {
      name: string;
      userIds: string[];
      rotationType: 'DAILY' | 'WEEKLY';
      startDate: Date;
      timezone: string;
    }
  ): Promise<OnCallSchedule> {
    // Create schedule
    const schedule = await prisma.onCallSchedule.create({
      data: {
        workspaceId,
        name: config.name,
        timezone: config.timezone,
        rotationType: config.rotationType,
        rotationStartAt: config.startDate,
        enabled: true,
      },
    });

    // Generate shifts for next 90 days
    await this.generateShifts(schedule, config.userIds, 90);

    return schedule;
  }

  private async generateShifts(
    schedule: OnCallSchedule,
    userIds: string[],
    days: number
  ): Promise<void> {
    const shifts: any[] = [];
    let currentDate = schedule.rotationStartAt;
    let userIndex = 0;

    for (let i = 0; i < days; i++) {
      const startAt = startOfDay(currentDate);
      const endAt = schedule.rotationType === 'WEEKLY' 
        ? endOfDay(addWeeks(currentDate, 1))
        : endOfDay(currentDate);

      shifts.push({
        scheduleId: schedule.id,
        userId: userIds[userIndex % userIds.length],
        startAt,
        endAt,
      });

      // Move to next rotation
      currentDate = schedule.rotationType === 'WEEKLY'
        ? addWeeks(currentDate, 1)
        : addDays(currentDate, 1);
      
      userIndex++;
    }

    await prisma.onCallShift.createMany({ data: shifts });
  }

  async getCurrentOnCallUser(scheduleId: string): Promise<User | null> {
    const now = new Date();

    // Check for overrides first
    const override = await prisma.onCallOverride.findFirst({
      where: {
        scheduleId,
        startAt: { lte: now },
        endAt: { gte: now },
      },
      include: { user: true },
    });

    if (override) {
      return override.user;
    }

    // Get regular shift
    const shift = await prisma.onCallShift.findFirst({
      where: {
        scheduleId,
        startAt: { lte: now },
        endAt: { gte: now },
      },
      include: { user: true },
    });

    return shift?.user || null;
  }

  async createOverride(
    scheduleId: string,
    data: {
      userId: string;
      startAt: Date;
      endAt: Date;
      reason?: string;
      createdBy: string;
    }
  ): Promise<OnCallOverride> {
    return prisma.onCallOverride.create({
      data: {
        scheduleId,
        ...data,
      },
    });
  }
}
```

---

## 3. Escalation Policy Engine

```typescript
// apps/api/src/on-call/escalation.service.ts
interface EscalationLevel {
  order: number;
  delayMinutes: number;
  targets: Array<{
    type: 'USER' | 'SCHEDULE' | 'ENTIRE_TEAM';
    id?: string;
  }>;
  notificationMethods: Array<'PUSH' | 'SMS' | 'VOICE'>;
}

@Injectable()
export class EscalationService {
  async executeEscalationPolicy(
    alertGroupId: string,
    policyId: string
  ): Promise<void> {
    const policy = await prisma.escalationPolicy.findUnique({
      where: { id: policyId },
    });

    const levels = policy.levels as EscalationLevel[];

    for (const level of levels.sort((a, b) => a.order - b.order)) {
      // Wait for delay
      await this.delay(level.delayMinutes * 60 * 1000);

      // Check if alert still needs escalation
      const alert = await prisma.alertGroup.findUnique({
        where: { id: alertGroupId },
      });

      if (alert.status !== 'OPEN') {
        // Alert was acknowledged, stop escalation
        return;
      }

      // Notify all targets in this level
      await this.notifyLevel(alertGroupId, level);
    }
  }

  private async notifyLevel(
    alertGroupId: string,
    level: EscalationLevel
  ): Promise<void> {
    const alert = await prisma.alertGroup.findUnique({
      where: { id: alertGroupId },
    });

    for (const target of level.targets) {
      let users: User[] = [];

      if (target.type === 'USER') {
        const user = await prisma.user.findUnique({ where: { id: target.id } });
        users = user ? [user] : [];
      } else if (target.type === 'SCHEDULE') {
        const onCallUser = await this.scheduleService.getCurrentOnCallUser(target.id);
        users = onCallUser ? [onCallUser] : [];
      } else if (target.type === 'ENTIRE_TEAM') {
        users = await prisma.user.findMany({
          where: { workspaceId: alert.workspaceId },
        });
      }

      // Send notifications via specified methods
      for (const user of users) {
        for (const method of level.notificationMethods) {
          await this.sendNotification(user, alert, method);
        }
      }
    }
  }

  private async sendNotification(
    user: User,
    alert: AlertGroup,
    method: 'PUSH' | 'SMS' | 'VOICE'
  ): Promise<void> {
    switch (method) {
      case 'PUSH':
        const tokens = await this.deviceTokenService.getActiveTokens(user.id);
        for (const token of tokens) {
          await this.pushService.sendPushNotification(token, alert);
        }
        break;
      
      case 'SMS':
        if (user.phoneNumber) {
          await this.smsService.sendAlertSms(user.phoneNumber, alert);
        }
        break;
      
      case 'VOICE':
        if (user.phoneNumber) {
          await this.voiceService.makeAlertCall(user.phoneNumber, alert);
        }
        break;
    }
  }
}
```

---

## 4. Calendar Integration

```typescript
// apps/api/src/on-call/calendar-sync.service.ts
import { google } from 'googleapis';

@Injectable()
export class CalendarSyncService {
  private calendar;

  constructor(private configService: ConfigService) {
    const auth = new google.auth.OAuth2(
      configService.get('GOOGLE_CLIENT_ID'),
      configService.get('GOOGLE_CLIENT_SECRET'),
      configService.get('GOOGLE_REDIRECT_URI')
    );

    this.calendar = google.calendar({ version: 'v3', auth });
  }

  async syncOnCallShift(shift: OnCallShift, user: User): Promise<void> {
    // Get user's Google Calendar access token
    const accessToken = await this.getUserCalendarToken(user.id);
    
    if (!accessToken) return;

    this.calendar.context._options.auth.setCredentials({
      access_token: accessToken,
    });

    // Create calendar event
    await this.calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `🚨 On-Call: ${shift.schedule.name}`,
        description: `You are on-call for SignalCraft.\n\nShift notes: ${shift.notes || 'None'}`,
        start: {
          dateTime: shift.startAt.toISOString(),
          timeZone: shift.schedule.timezone,
        },
        end: {
          dateTime: shift.endAt.toISOString(),
          timeZone: shift.schedule.timezone,
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 60 },       // 1 hour before
          ],
        },
      },
    });
  }
}
```

---

## 5. On-Call Analytics

```typescript
// apps/api/src/on-call/analytics.service.ts
@Injectable()
export class OnCallAnalyticsService {
  async getOnCallMetrics(workspaceId: string, period: string) {
    const alerts = await prisma.alertGroup.findMany({
      where: {
        workspaceId,
        firstSeenAt: {
          gte: this.getPeriodStart(period),
        },
      },
    });

    return {
      totalAlerts: alerts.length,
      avgResponseTimeMinutes: this.calculateAvgResponseTime(alerts),
      alertsByUser: this.groupByAssignee(alerts),
      afterHoursAlerts: this.countAfterHoursAlerts(alerts),
      burnoutScore: this.calculateBurnoutScore(alerts),
    };
  }

  private calculateBurnoutScore(alerts: AlertGroup[]): number {
    // Calculate based on:
    // - Number of after-hours alerts
    // - Response time variance (inconsistency = fatigue)
    // - Total alerts per person
    // Score 0-100 (higher = more burnout risk)
    
    const afterHoursCount = this.countAfterHoursAlerts(alerts);
    const totalAlerts = alerts.length;
    const afterHoursRatio = afterHoursCount / Math.max(totalAlerts, 1);
    
    // Simple burnout score: 100 * after-hours ratio + volume penalty
    return Math.min(100, afterHoursRatio * 100 + (totalAlerts / 100) * 10);
  }
}
```

---

## 📊 Success Metrics

- [ ] On-call rotation created and functional
- [ ] Calendar sync working (Google + Outlook)
- [ ] Override system tested
- [ ] Multi-level escalation policies working
- [ ] Handoff notes feature complete
- [ ] Analytics dashboard shows burnout metrics

---

## ⏱️ Timeline

**Week 1**: Database schema + basic schedule CRUD
**Week 2**: Rotation generation + override logic
**Week 3**: Escalation policies + calendar sync
**Week 4**: Analytics + handoff system

---

## ✅ Definition of Done

- On-call schedules can be created and managed
- Rotations automatically generate shifts
- Overrides work correctly
- Escalation flows to multiple levels
- Calendar integration syncs shifts
- Team can view on-call analytics
