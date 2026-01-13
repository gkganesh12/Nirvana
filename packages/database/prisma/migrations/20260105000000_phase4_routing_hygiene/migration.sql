-- Phase 4: Routing Rules & Alert Hygiene Schema Updates

-- Add new fields to AlertGroup for hygiene features
ALTER TABLE "AlertGroup" ADD COLUMN IF NOT EXISTS "snoozeUntil" TIMESTAMP(3);
ALTER TABLE "AlertGroup" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);

-- Add new fields to RoutingRule for better rule management
ALTER TABLE "RoutingRule" ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT 'Unnamed Rule';
ALTER TABLE "RoutingRule" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "RoutingRule" ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 0;

-- Add index for auto-close queries (finding stale alerts)
CREATE INDEX IF NOT EXISTS "AlertGroup_lastSeenAt_idx" ON "AlertGroup"("lastSeenAt");

-- Add composite index for efficient rule queries (workspace + enabled + priority)
CREATE INDEX IF NOT EXISTS "RoutingRule_workspaceId_enabled_priority_idx" ON "RoutingRule"("workspaceId", "enabled", "priority");
