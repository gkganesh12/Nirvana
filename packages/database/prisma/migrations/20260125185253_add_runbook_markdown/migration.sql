-- Add runbook markdown draft storage
ALTER TABLE "AlertGroup" ADD COLUMN IF NOT EXISTS "runbookMarkdown" TEXT;
