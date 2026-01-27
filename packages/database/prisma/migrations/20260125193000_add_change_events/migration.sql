-- Add change events for alert correlation
CREATE TABLE IF NOT EXISTS "ChangeEvent" (
  "id" TEXT PRIMARY KEY,
  "workspaceId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "title" TEXT,
  "project" TEXT,
  "environment" TEXT,
  "actor" TEXT,
  "details" JSONB,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ChangeEvent_workspaceId_idx" ON "ChangeEvent" ("workspaceId");
CREATE INDEX IF NOT EXISTS "ChangeEvent_workspaceId_timestamp_idx" ON "ChangeEvent" ("workspaceId", "timestamp");
CREATE INDEX IF NOT EXISTS "ChangeEvent_workspaceId_project_idx" ON "ChangeEvent" ("workspaceId", "project");
CREATE INDEX IF NOT EXISTS "ChangeEvent_workspaceId_environment_idx" ON "ChangeEvent" ("workspaceId", "environment");

ALTER TABLE "ChangeEvent" ADD CONSTRAINT "ChangeEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
