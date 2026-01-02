-- Create enums
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE "IntegrationType" AS ENUM ('SENTRY', 'SLACK');
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'DISABLED', 'ERROR');
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACK', 'SNOOZED', 'RESOLVED');
CREATE TYPE "NotificationTarget" AS ENUM ('SLACK');
CREATE TYPE "NotificationStatus" AS ENUM ('SENT', 'FAILED');

-- Create tables
CREATE TABLE "Workspace" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "clerkId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "displayName" TEXT,
  "role" "WorkspaceRole" NOT NULL DEFAULT 'MEMBER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Integration" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "type" "IntegrationType" NOT NULL,
  "status" "IntegrationStatus" NOT NULL DEFAULT 'ACTIVE',
  "configJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AlertEvent" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "sourceEventId" TEXT NOT NULL,
  "project" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "severity" "AlertSeverity" NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "tagsJson" JSONB NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "payloadJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AlertEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AlertGroup" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "groupKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "severity" "AlertSeverity" NOT NULL,
  "environment" TEXT NOT NULL,
  "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
  "assigneeUserId" TEXT,
  "firstSeenAt" TIMESTAMP(3) NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  "runbookUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AlertGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoutingRule" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "conditionsJson" JSONB NOT NULL,
  "actionsJson" JSONB NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RoutingRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationLog" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "target" "NotificationTarget" NOT NULL,
  "targetRef" TEXT NOT NULL,
  "alertGroupId" TEXT NOT NULL,
  "status" "NotificationStatus" NOT NULL,
  "errorMessage" TEXT,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- Indexes and constraints
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "AlertEvent_workspaceId_sourceEventId_key" ON "AlertEvent"("workspaceId", "sourceEventId");

CREATE INDEX "User_workspaceId_idx" ON "User"("workspaceId");
CREATE INDEX "Integration_workspaceId_idx" ON "Integration"("workspaceId");
CREATE INDEX "AlertEvent_workspaceId_idx" ON "AlertEvent"("workspaceId");
CREATE INDEX "AlertGroup_groupKey_idx" ON "AlertGroup"("groupKey");
CREATE INDEX "AlertGroup_workspaceId_idx" ON "AlertGroup"("workspaceId");
CREATE INDEX "AlertGroup_status_idx" ON "AlertGroup"("status");
CREATE INDEX "RoutingRule_workspaceId_idx" ON "RoutingRule"("workspaceId");
CREATE INDEX "NotificationLog_workspaceId_idx" ON "NotificationLog"("workspaceId");
CREATE INDEX "NotificationLog_alertGroupId_idx" ON "NotificationLog"("alertGroupId");

-- Foreign keys
ALTER TABLE "User" ADD CONSTRAINT "User_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AlertEvent" ADD CONSTRAINT "AlertEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AlertGroup" ADD CONSTRAINT "AlertGroup_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AlertGroup" ADD CONSTRAINT "AlertGroup_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RoutingRule" ADD CONSTRAINT "RoutingRule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_alertGroupId_fkey" FOREIGN KEY ("alertGroupId") REFERENCES "AlertGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
