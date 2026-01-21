# Phase 5: Incident Management (Months 5-6)

> **Priority**: 🟢 MEDIUM - Full incident lifecycle management

## Overview

Build comprehensive incident management system distinct from alert groups - focusing on incident response, collaboration, postmortems, and learning from failures.

---

## 🎯 Objectives

1. **Incident creation & lifecycle** (detect → respond → resolve → learn)
2. **Incident timeline** with stakeholder updates
3. **War room** (Slack integration for incident channels)
4. **Roles assignment** (Incident Commander, Tech Lead, Comms Lead)
5. **Postmortem templates** with action item tracking
6. **SLA tracking** per severity
7. **Incident analytics** & trends

---

## 1. Database Schema

```prisma
model Incident {
  id              String         @id @default(cuid())
  workspaceId     String
  number          Int            // Human-readable #INC-001
  title           String
  description     String         @db.Text
  severity        IncidentSeverity
  status          IncidentStatus
  impact          String?        @db.Text
  
  // Timeline
  detectedAt      DateTime
  acknowledgedAt  DateTime?
  mitigatedAt     DateTime?      // Temporary fix applied
  resolvedAt      DateTime?
  closedAt        DateTime?
  
  // SLA Tracking
  slaBreached     Boolean        @default(false)
  slaDeadline     DateTime?
  
  // Incident Command
  commanderId     String?        // Incident Commander
  techLeadId      String?
  commsLeadId     String?
  
  // Slack War Room
  slackChannelId  String?
  slackChannelUrl String?
  
  // Related
  alertGroupIds   String[]       // Multiple alerts can trigger one incident
  rootCause       String?        @db.Text
  
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  workspace       Workspace          @relation(fields: [workspaceId], references: [id])
  commander       User?              @relation("IncidentCommander", fields: [commanderId], references: [id])
  techLead        User?              @relation("TechLead", fields: [techLeadId], references: [id])
  commsLead       User?              @relation("CommsLead", fields: [commsLeadId], references: [id])
  
  timeline        IncidentTimelineEntry[]
  postmortem      Postmortem?
  affectedServices AffectedService[]

  @@unique([workspaceId, number])
  @@index([workspaceId, status])
  @@index([severity, status])
}

enum IncidentSeverity {
  SEV1  // Critical - Complete outage
  SEV2  // High - Major functionality broken
  SEV3  // Medium - Partial functionality broken
  SEV4  // Low - Minor issue
}

enum IncidentStatus {
  INVESTIGATING
  IDENTIFIED
  MONITORING
  RESOLVED
  CLOSED
}

model IncidentTimelineEntry {
  id          String   @id @default(cuid())
  incidentId  String
  authorId    String
  type        String   // DETECTED, ACKNOWLEDGED, UPDATE, MITIGATION, RESOLUTION, NOTE
  message     String   @db.Text
  isPublic    Boolean  @default(false)  // For external status page
  timestamp   DateTime @default(now())

  incident Incident @relation(fields: [incidentId], references: [id], onDelete: Cascade)
  author   User     @relation(fields: [authorId], references: [id])

  @@index([incidentId, timestamp])
}

model AffectedService {
  id          String   @id @default(cuid())
  incidentId  String
  serviceName String
  impact      String   // TOTAL_OUTAGE, DEGRADED, PARTIAL_OUTAGE

  incident Incident @relation(fields: [incidentId], references: [id], onDelete: Cascade)

  @@index([incidentId])
}

model Postmortem {
  id                String   @id @default(cuid())
  incidentId        String   @unique
  workspaceId       String
  
  summary           String   @db.Text
  whatHappened      String   @db.Text
  whyItHappened     String   @db.Text
  whatWentWell      String   @db.Text
  whatWentPoorly    String   @db.Text
  whereWeGotLucky   String?  @db.Text
  
  timeline          Json     // Detailed timeline
  impactAssessment  String   @db.Text
  
  publishedAt       DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  incident     Incident     @relation(fields: [incidentId], references: [id], onDelete: Cascade)
  workspace    Workspace    @relation(fields: [workspaceId], references: [id])
  actionItems  ActionItem[]

  @@index([workspaceId])
}

model ActionItem {
  id            String   @id @default(cuid())
  postmortemId  String
  description   String   @db.Text
  assigneeId    String?
  status        String   @default("OPEN")  // OPEN, IN_PROGRESS, DONE
  dueDate       DateTime?
  completedAt   DateTime?
  createdAt     DateTime @default(now())

  postmortem Postmortem @relation(fields: [postmortemId], references: [id], onDelete: Cascade)
  assignee   User?      @relation(fields: [assigneeId], references: [id])

  @@index([postmortemId])
  @@index([assigneeId, status])
}
```

---

## 2. Incident Service

```typescript
// apps/api/src/incidents/incidents.service.ts
@Injectable()
export class IncidentsService {
  async createIncident(data: {
    workspaceId: string;
    title: string;
    description: string;
    severity: IncidentSeverity;
    alertGroupIds?: string[];
    detectedAt: Date;
  }): Promise<Incident> {
    // Generate incident number
    const lastIncident = await prisma.incident.findFirst({
      where: { workspaceId: data.workspaceId },
      orderBy: { number: 'desc' },
    });

    const number = (lastIncident?.number || 0) + 1;

    // Create incident
    const incident = await prisma.incident.create({
      data: {
        ...data,
        number,
        status: 'INVESTIGATING',
        slaDeadline: this.calculateSlaDeadline(data.severity, data.detectedAt),
      },
    });

    // Create Slack war room for SEV1/SEV2
    if (data.severity === 'SEV1' || data.severity === 'SEV2') {
      await this.createWarRoom(incident);
    }

    // Create initial timeline entry
    await this.addTimelineEntry({
      incidentId: incident.id,
      type: 'DETECTED',
      message: `Incident #INC-${number} detected: ${data.title}`,
      isPublic: true,
    });

    // Notify incident commander
    await this.notifyIncidentCommander(incident);

    return incident;
  }

  private calculateSlaDeadline(
    severity: IncidentSeverity,
    detectedAt: Date
  ): Date {
    const slaMinutes = {
      SEV1: 15,   // Must acknowledge within 15 min
      SEV2: 30,
      SEV3: 120,
      SEV4: 480,
    };

    return addMinutes(detectedAt, slaMinutes[severity]);
  }

  async assignRole(
    incidentId: string,
    role: 'commander' | 'techLead' | 'commsLead',
    userId: string
  ): Promise<void> {
    const update: any = {};
    update[`${role}Id`] = userId;

    await prisma.incident.update({
      where: { id: incidentId },
      data: update,
    });

    await this.addTimelineEntry({
      incidentId,
      type: 'ROLE_ASSIGNED',
      message: `${role} assigned to ${user.displayName}`,
      isPublic: false,
    });
  }

  async updateStatus(
    incidentId: string,
    status: IncidentStatus,
    message?: string
  ): Promise<void> {
    const now = new Date();
    const update: any = { status };

    // Track timestamps for each status change
    if (status === 'IDENTIFIED') {
      update.acknowledgedAt = now;
    } else if (status === 'MONITORING') {
      update.mitigatedAt = now;
    } else if (status === 'RESOLVED') {
      update.resolvedAt = now;
    } else if (status === 'CLOSED') {
      update.closedAt = now;
    }

    await prisma.incident.update({
      where: { id: incidentId },
      data: update,
    });

    await this.addTimelineEntry({
      incidentId,
      type: 'STATUS_CHANGE',
      message: message || `Status changed to ${status}`,
      isPublic: true,
    });

    // Post update to Slack war room
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
    });

    if (incident.slackChannelId) {
      await this.postToWarRoom(incident, `📊 Status Update: ${status}\n${message || ''}`);
    }
  }

  async addTimelineEntry(data: {
    incidentId: string;
    authorId?: string;
    type: string;
    message: string;
    isPublic: boolean;
  }): Promise<IncidentTimelineEntry> {
    return prisma.incidentTimelineEntry.create({
      data,
    });
  }
}
```

---

## 3. Slack War Room Integration

```typescript
// apps/api/src/incidents/war-room.service.ts
@Injectable()
export class WarRoomService {
  async createWarRoom(incident: Incident): Promise<void> {
    const channelName = `inc-${incident.number}-${incident.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 20)}`;

    // Create Slack channel
    const channel = await this.slackService.createChannel({
      name: channelName,
      is_private: false,
    });

    // Set channel topic
    await this.slackService.setChannelTopic(
      channel.id,
      `🚨 [SEV${incident.severity}] ${incident.title} | Status: ${incident.status}`
    );

    // Invite key people
    const commander = await prisma.user.findUnique({
      where: { id: incident.commanderId },
    });

    if (commander) {
      await this.slackService.inviteToChannel(channel.id, commander.slackUserId);
    }

    // Pin incident info
    const infoMessage = await this.slackService.postMessage(channel.id, {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `🚨 Incident #INC-${incident.number}`,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Severity:* SEV${incident.severity}` },
            { type: 'mrkdwn', text: `*Status:* ${incident.status}` },
            { type: 'mrkdwn', text: `*Commander:* <@${commander.slackUserId}>` },
            { type: 'mrkdwn', text: `*Detected:* ${incident.detectedAt.toLocaleString()}` },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Description:*\n${incident.description}`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Mark Resolved' },
              action_id: 'resolve_incident',
              value: incident.id,
              style: 'primary',
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Add Update' },
              action_id: 'add_update',
              value: incident.id,
            },
          ],
        },
      ],
    });

    await this.slackService.pinMessage(channel.id, infoMessage.ts);

    // Update incident with channel info
    await prisma.incident.update({
      where: { id: incident.id },
      data: {
        slackChannelId: channel.id,
        slackChannelUrl: `https://yourworkspace.slack.com/archives/${channel.id}`,
      },
    });
  }

  async postUpdate(incidentId: string, update: string): Promise<void> {
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
    });

    if (!incident.slackChannelId) return;

    await this.slackService.postMessage(incident.slackChannelId, {
      text: update,
      mrkdwn: true,
    });
  }
}
```

---

## 4. Postmortem Generation

```typescript
// apps/api/src/incidents/postmortem.service.ts
@Injectable()
export class PostmortemService {
  async generatePostmortemTemplate(incidentId: string): Promise<Postmortem> {
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        timeline: { orderBy: { timestamp: 'asc' } },
        affectedServices: true,
      },
    });

    // Use AI to generate initial draft
    const aiDraft = await this.aiService.generatePostmortem(incident);

    return prisma.postmortem.create({
      data: {
        incidentId,
        workspaceId: incident.workspaceId,
        summary: aiDraft.summary,
        whatHappened: aiDraft.whatHappened,
        whyItHappened: 'To be determined during postmortem meeting',
        whatWentWell: 'To be discussed',
        whatWentPoorly: 'To be discussed',
        timeline: incident.timeline.map(entry => ({
          timestamp: entry.timestamp,
          event: entry.message,
        })),
        impactAssessment: this.calculateImpact(incident),
      },
    });
  }

  async addActionItem(
    postmortemId: string,
    data: {
      description: string;
      assigneeId?: string;
      dueDate?: Date;
    }
  ): Promise<ActionItem> {
    return prisma.actionItem.create({
      data: {
        postmortemId,
        ...data,
      },
    });
  }

  async publishPostmortem(postmortemId: string): Promise<void> {
    await prisma.postmortem.update({
      where: { id: postmortemId },
      data: {
        publishedAt: new Date(),
      },
    });

    // Notify team
    // Send to Slack, email, etc.
  }
}
```

---

## 📊 Success Metrics

- [ ] Incidents can be created and managed
- [ ] Slack war rooms auto-created
- [ ] Roles (IC, Tech Lead, Comms) assignable
- [ ] Timeline tracks all updates
- [ ] Postmortems generated
- [ ] Action items tracked
- [ ] SLA tracking functional

---

## ⏱️ Timeline

**Weeks 1-2**: Incident CRUD + timeline
**Weeks 3-4**: Slack integration + war rooms
**Weeks 5-6**: Postmortems + action items
**Weeks 7-8**: Analytics + SLA tracking

---

## ✅ Definition of Done

- Full incident lifecycle implemented
- War room creation automated
- Postmortem templates working
- Action items tracked to completion
- Team can run incident drills
