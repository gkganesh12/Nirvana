-- Add status page enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatusPageVisibility') THEN
    CREATE TYPE "StatusPageVisibility" AS ENUM ('PUBLIC', 'PRIVATE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatusIncidentStatus') THEN
    CREATE TYPE "StatusIncidentStatus" AS ENUM ('INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatusIncidentImpact') THEN
    CREATE TYPE "StatusIncidentImpact" AS ENUM ('NONE', 'MINOR', 'MAJOR', 'CRITICAL');
  END IF;
END $$;

-- Status pages
CREATE TABLE IF NOT EXISTS "StatusPage" (
  "id" TEXT PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "visibility" "StatusPageVisibility" NOT NULL DEFAULT 'PUBLIC',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "StatusPage_slug_key" ON "StatusPage" ("slug");
CREATE INDEX IF NOT EXISTS "StatusPage_workspaceId_idx" ON "StatusPage" ("workspaceId");

ALTER TABLE "StatusPage" ADD CONSTRAINT "StatusPage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Status page incidents
CREATE TABLE IF NOT EXISTS "StatusPageIncident" (
  "id" TEXT PRIMARY KEY,
  "statusPageId" TEXT NOT NULL,
  "alertGroupId" TEXT,
  "title" TEXT NOT NULL,
  "status" "StatusIncidentStatus" NOT NULL,
  "impact" "StatusIncidentImpact" NOT NULL DEFAULT 'MINOR',
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "StatusPageIncident_statusPageId_idx" ON "StatusPageIncident" ("statusPageId");
CREATE INDEX IF NOT EXISTS "StatusPageIncident_alertGroupId_idx" ON "StatusPageIncident" ("alertGroupId");
CREATE INDEX IF NOT EXISTS "StatusPageIncident_statusPageId_status_idx" ON "StatusPageIncident" ("statusPageId", "status");

ALTER TABLE "StatusPageIncident" ADD CONSTRAINT "StatusPageIncident_statusPageId_fkey" FOREIGN KEY ("statusPageId") REFERENCES "StatusPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StatusPageIncident" ADD CONSTRAINT "StatusPageIncident_alertGroupId_fkey" FOREIGN KEY ("alertGroupId") REFERENCES "AlertGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Subscribers
CREATE TABLE IF NOT EXISTS "StatusPageSubscriber" (
  "id" TEXT PRIMARY KEY,
  "statusPageId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "verifyToken" TEXT NOT NULL,
  "unsubscribedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "StatusPageSubscriber_statusPageId_email_key" ON "StatusPageSubscriber" ("statusPageId", "email");
CREATE INDEX IF NOT EXISTS "StatusPageSubscriber_statusPageId_idx" ON "StatusPageSubscriber" ("statusPageId");
CREATE INDEX IF NOT EXISTS "StatusPageSubscriber_email_idx" ON "StatusPageSubscriber" ("email");

ALTER TABLE "StatusPageSubscriber" ADD CONSTRAINT "StatusPageSubscriber_statusPageId_fkey" FOREIGN KEY ("statusPageId") REFERENCES "StatusPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
