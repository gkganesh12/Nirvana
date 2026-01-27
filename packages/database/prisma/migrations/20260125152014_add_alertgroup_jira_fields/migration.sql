-- Add Jira ticket fields to AlertGroup
ALTER TABLE "AlertGroup" ADD COLUMN IF NOT EXISTS "jiraIssueKey" TEXT;
ALTER TABLE "AlertGroup" ADD COLUMN IF NOT EXISTS "jiraIssueUrl" TEXT;
